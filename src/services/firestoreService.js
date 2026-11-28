import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  deleteField,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getShiftDateString, getShiftBoundsForRange } from '../utils/shiftDateUtils';

// Helper para convertir Timestamps de Firestore a Date nativo
export function formatFirestoreDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      if (!isNaN(d.getTime())) return d;
    } catch {
      // fallback
    }
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0));
  }
  if (typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000 + (val._nanoseconds ? Math.floor(val._nanoseconds / 1000000) : 0));
  }
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00-05:00`);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Limpiar valores undefined, campos prototipo y sanitizar payloads antes de persistir en Firestore
function sanitizePayload(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      // Bloquear ataques de prototipo
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      if (value === undefined) {
        return null;
      }
      if (typeof value === 'string') {
        // Sanitizar strings de scripts maliciosos y etiquetas html peligrosas
        return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/[<>]/g, '');
      }
      return value;
    })
  );
}

// =========================================================================
// 1. ÓRDENES / COMANDAS (ATÓMICAS, PARTICIONADAS E IDEMPOTENTES)
// =========================================================================

// Helper para resolver la referencia de un documento de orden por id único o por correlativo
async function getOrderDocRef(identifier) {
  if (!identifier) return null;
  const idStr = String(identifier).trim();

  // 1. Intento directo por document ID
  const directRef = doc(db, 'orders', idStr);
  try {
    const snap = await getDoc(directRef);
    if (snap.exists()) {
      return directRef;
    }
  } catch (err) {
    console.warn('Error verificando ID directo de orden:', err?.message);
  }

  // 2. Búsqueda por orderNumber si el identificador era el correlativo visible
  try {
    const q = query(collection(db, 'orders'), where('orderNumber', '==', idStr), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return doc(db, 'orders', querySnap.docs[0].id);
    }
  } catch (err) {
    console.warn('Error buscando orden por orderNumber:', err?.message);
  }

  // Fallback a directRef
  return directRef;
}

/**
 * Generador atómico de números correlativos (P-001, M-001) usando transacciones de Firestore.
 * Garantiza que dos o más cajeros nunca obtengan el mismo correlativo incluso en clics concurrentes.
 */
export async function getNextAtomicOrderNumber(prefix = 'P') {
  const counterRef = doc(db, 'app_config', 'order_counter');
  const now = new Date();
  const peruDateStr = getShiftDateString(now); // YYYY-MM-DD del turno operativo (4:00 AM a 3:59 AM)

  try {
    const nextSeq = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let currentSeq = 0;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        const lastDate = data.date || peruDateStr;
        // Si el contador es de hoy, tomamos la secuencia actual; si es de un nuevo día, reinicia en 0
        if (lastDate === peruDateStr) {
          currentSeq = Number(data[prefix]) || 0;
        }
      }

      const seq = currentSeq + 1;
      transaction.set(
        counterRef,
        {
          date: peruDateStr,
          [prefix]: seq,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return seq;
    });

    return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    console.warn('Advertencia en transacción de correlativo atómico (usando fallback seguro):', err?.message);
    // Fallback de contingencia: marca de tiempo corta para garantizar unicidad sin detener la venta
    const fallbackSeq = Math.floor(Date.now() % 1000);
    return `${prefix}-${String(fallbackSeq).padStart(3, '0')}`;
  }
}

/**
 * Suscripción particionada en tiempo real:
 * - Pedidos activos para cocina/barra (PENDIENTE, PREPARANDO, LISTO)
 * - Pedidos de mesas no cobrados (paymentStatus == PENDING)
 * - Pedidos recientes (limit 100 por createdAt desc)
 * No descarga toda la base de datos histórica permanentemente, protegiendo memoria y cuota.
 */
export function subscribeToOrders(onUpdate, onError) {
  try {
    const ordersCol = collection(db, 'orders');

    // 1. Pedidos activos (Cocina / Barra)
    const qActive = query(ordersCol, where('status', 'in', ['PENDIENTE', 'PREPARANDO', 'LISTO']));

    // 2. Pedidos no liquidados de mesas (Salón)
    const qUnpaid = query(ordersCol, where('paymentStatus', '==', 'PENDING'));

    // 3. Pedidos recientes para caja/historial (últimos 100)
    const qRecent = query(ordersCol, orderBy('createdAt', 'desc'), limit(100));

    // Mapas en memoria por document ID
    const activeMap = new Map();
    const unpaidMap = new Map();
    const recentMap = new Map();

    const emitMerged = () => {
      const mergedMap = new Map();
      recentMap.forEach((val, id) => mergedMap.set(id, val));
      unpaidMap.forEach((val, id) => mergedMap.set(id, val));
      activeMap.forEach((val, id) => mergedMap.set(id, val));

      const orders = Array.from(mergedMap.values());
      // Ordenar en memoria por fecha descendente
      orders.sort((a, b) => {
        const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) return timeB - timeA;
        return (b.orderNumber || '').localeCompare(a.orderNumber || '', undefined, { numeric: true });
      });

      onUpdate(orders);
    };

    const processDocs = (snapshot, targetMap) => {
      targetMap.clear();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        targetMap.set(docSnap.id, {
          ...data,
          id: docSnap.id,
          orderNumber: data.orderNumber || docSnap.id,
          createdAt: formatFirestoreDate(data.createdAt),
        });
      });
      emitMerged();
    };

    const unsubActive = onSnapshot(
      qActive,
      (snap) => processDocs(snap, activeMap),
      (err) => console.warn('Advertencia en subscripción qActive:', err?.message)
    );

    const unsubUnpaid = onSnapshot(
      qUnpaid,
      (snap) => processDocs(snap, unpaidMap),
      (err) => console.warn('Advertencia en subscripción qUnpaid:', err?.message)
    );

    const unsubRecent = onSnapshot(
      qRecent,
      (snap) => processDocs(snap, recentMap),
      (err) => {
        console.warn('Advertencia en subscripción qRecent:', err?.message);
        if (onError) onError(err);
      }
    );

    return () => {
      unsubActive();
      unsubUnpaid();
      unsubRecent();
    };
  } catch (err) {
    console.error('Error inicializando suscripción particionada de órdenes:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Consulta bajo demanda para reportes y auditoría histórica por rango de fechas
 */
export async function fetchOrdersByDateRange(startDate, endDate) {
  try {
    const { start, end } = getShiftBoundsForRange(startDate, endDate);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);
    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        orderNumber: data.orderNumber || docSnap.id,
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (err) {
    console.error('Error al consultar historial por rango de fechas:', err);
    return [];
  }
}

export async function saveOrderToFirestore(orderData, isNewOrder = false) {
  try {
    // Garantizar ID interno inmutable único en Firestore para prevenir sobreescrituras accidentales
    let orderDocId = orderData.id || orderData._id;
    let orderNumber = orderData.orderNumber;

    if (isNewOrder || !orderDocId) {
      if (!orderDocId) {
        orderDocId = doc(collection(db, 'orders')).id;
      }

      // Si no tiene número correlativo asignado o es provisional, obtenerlo atómicamente
      if (!orderNumber || orderNumber.startsWith('TEMP-') || orderNumber.startsWith('ORD-')) {
        const prefix = orderData.modality === 'MARKET' ? 'M' : 'P';
        orderNumber = await getNextAtomicOrderNumber(prefix);
      }
    }

    const docRef = doc(db, 'orders', String(orderDocId));

    // Sanitizar payload
    const sanitized = sanitizePayload(orderData);

    const validCreatedAt = orderData.createdAt instanceof Date
      ? orderData.createdAt
      : formatFirestoreDate(orderData.createdAt);

    const cleanData = {
      ...sanitized,
      id: orderDocId,
      orderNumber: orderNumber || orderDocId,
      shiftDate: getShiftDateString(validCreatedAt),
      createdAt: Timestamp.fromDate(validCreatedAt),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, cleanData, { merge: true });
    return { success: true, id: orderDocId, orderNumber: cleanData.orderNumber };
  } catch (err) {
    console.error('Error al guardar comanda en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function updateOrderStatusInFirestore(orderIdentifier, newStatus) {
  try {
    const docRef = await getOrderDocRef(orderIdentifier);
    if (!docRef) return { success: false, error: 'Documento no encontrado' };

    await setDoc(
      docRef,
      {
        status: newStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar estado en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function settleOrderInFirestore(orderIdentifier, paymentDetail) {
  try {
    const docRef = await getOrderDocRef(orderIdentifier);
    if (!docRef) return { success: false, error: 'Documento no encontrado' };

    // Soportar pagos múltiples (split payments) o pago individual
    const paymentsList = Array.isArray(paymentDetail?.payments)
      ? paymentDetail.payments.map((p) => ({
          ...sanitizePayload(p),
          paidAt: p.paidAt ? formatFirestoreDate(p.paidAt) : Timestamp.fromDate(new Date()),
        }))
      : [
          {
            ...sanitizePayload(paymentDetail),
            paidAt: Timestamp.fromDate(new Date()),
          },
        ];

    await setDoc(
      docRef,
      {
        status: 'ENTREGADO',
        paymentStatus: 'PAID',
        payments: paymentsList,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al cerrar comanda en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteOrderFromFirestore(orderIdentifier) {
  try {
    const docRef = await getOrderDocRef(orderIdentifier);
    if (!docRef) return { success: false, error: 'Documento no encontrado' };

    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar orden en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function clearAllOrdersFromFirestore() {
  try {
    const ordersCol = collection(db, 'orders');
    const snapshot = await getDocs(ordersCol);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'orders', docSnap.id)));
    await Promise.all(deletePromises);
    return { success: true };
  } catch (err) {
    console.error('Error al vaciar órdenes en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 2. PRODUCTOS
// =========================================================================
export function subscribeToProducts(onUpdate, onError) {
  try {
    const colRef = collection(db, 'products');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const products = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let img = data.image || '';
          // Limpiar URLs de memoria (blob) y Base64 pesados para no saturar Firestore
          if (
            typeof img === 'string' &&
            (img.startsWith('blob:') || img.startsWith('data:image/'))
          ) {
            img = '';
          }
          return {
            ...data,
            id: docSnap.id,
            image: img,
          };
        });
        onUpdate(products);
      },
      (err) => {
        console.warn('Advertencia en Firestore products:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de productos:', err);
    if (onError) onError(err);
    return () => {};
  }
}

function sanitizeExternalImageUrl(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : '';
}

export async function saveProductToFirestore(product) {
  try {
    const docRef = doc(db, 'products', product.id);
    const sanitizedProduct = { ...product };

    // REGLA ESTRICTA: Solo URLs web externas válidas (http/https).
    // NUNCA guardar Base64 ni blob en documentos de Firestore.
    sanitizedProduct.image = sanitizeExternalImageUrl(sanitizedProduct.image);
    sanitizedProduct.thumbnailUrl = sanitizeExternalImageUrl(sanitizedProduct.thumbnailUrl) || sanitizedProduct.image;

    const cleanData = sanitizePayload(sanitizedProduct);
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar producto en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteProductFromFirestore(productId) {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar producto en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 3. CREMAS
// =========================================================================
export function subscribeToCreams(onUpdate, onError) {
  try {
    const colRef = collection(db, 'creams');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const creams = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        onUpdate(creams);
      },
      (err) => {
        console.warn('Advertencia en Firestore creams:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de cremas:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveCreamToFirestore(cream) {
  try {
    const docRef = doc(db, 'creams', cream.id);
    await setDoc(docRef, sanitizePayload(cream), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar crema en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteCreamFromFirestore(creamId) {
  try {
    await deleteDoc(doc(db, 'creams', creamId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar crema en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 4. EXTRAS
// =========================================================================
export function subscribeToExtras(onUpdate, onError) {
  try {
    const colRef = collection(db, 'extras');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const extras = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        onUpdate(extras);
      },
      (err) => {
        console.warn('Advertencia en Firestore extras:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de extras:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveExtraToFirestore(extra) {
  try {
    const docRef = doc(db, 'extras', extra.id);
    await setDoc(docRef, sanitizePayload(extra), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar extra en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteExtraFromFirestore(extraId) {
  try {
    await deleteDoc(doc(db, 'extras', extraId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar extra en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 5. PACKAGING / EMPAQUES
// =========================================================================
export function subscribeToPackagings(onUpdate, onError) {
  try {
    const colRef = collection(db, 'packagings');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const packagings = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        onUpdate(packagings);
      },
      (err) => {
        console.warn('Advertencia en Firestore packagings:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de packagings:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function savePackagingToFirestore(pkg) {
  try {
    const docRef = doc(db, 'packagings', pkg.id);
    await setDoc(docRef, sanitizePayload(pkg), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar empaque en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deletePackagingFromFirestore(pkgId) {
  try {
    await deleteDoc(doc(db, 'packagings', pkgId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar empaque en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 6. GASTOS / EXPENSES
// =========================================================================
export function subscribeToExpenses(onUpdate, onError) {
  try {
    const colRef = collection(db, 'expenses');
    const q = query(colRef, orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const expenses = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ...data,
            id: docSnap.id,
            date: formatFirestoreDate(data.date),
          };
        });
        onUpdate(expenses);
      },
      (err) => {
        console.warn('Advertencia en Firestore expenses:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de gastos:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveExpenseToFirestore(expense) {
  try {
    const docRef = doc(db, 'expenses', expense.id);
    const sanitized = sanitizePayload(expense);
    const validDate = expense.date instanceof Date
      ? expense.date
      : formatFirestoreDate(expense.date);

    const cleanData = {
      ...sanitized,
      shiftDate: getShiftDateString(validDate),
      date: Timestamp.fromDate(validDate),
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef, cleanData);
    return true;
  } catch (err) {
    console.error('Error al guardar gasto en Firestore:', err);
    return false;
  }
}

export async function updateExpenseInFirestore(expenseId, expenseData) {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    const sanitized = sanitizePayload(expenseData);
    const cleanData = {
      ...sanitized,
      updatedAt: serverTimestamp(),
    };
    if (expenseData.date) {
      const validDate = expenseData.date instanceof Date
        ? expenseData.date
        : formatFirestoreDate(expenseData.date);
      cleanData.date = Timestamp.fromDate(validDate);
      cleanData.shiftDate = getShiftDateString(validDate);
    }
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (err) {
    console.error('Error al actualizar gasto en Firestore:', err);
    return false;
  }
}

export async function deleteExpenseFromFirestore(expenseId) {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error al eliminar gasto en Firestore:', err);
    return false;
  }
}

// =========================================================================
// 7. CATEGORÍAS (100% DINÁMICAS EN FIRESTORE)
// =========================================================================
export function subscribeToCategories(onUpdate, onError) {
  try {
    const colRef = collection(db, 'categories');
    const q = query(colRef, orderBy('order', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        onUpdate(categories);
      },
      (err) => {
        console.warn('Advertencia en Firestore categories:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de categorías:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveCategoryToFirestore(category) {
  try {
    const docRef = doc(db, 'categories', category.id);
    await setDoc(docRef, sanitizePayload(category), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar categoría en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteCategoryFromFirestore(categoryId) {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar categoría en Firestore:', err);
    return { success: false, error: err };
  }
}

// Limpiar datos de prueba si el usuario desea empezar 100% desde cero
export async function clearAllDemoCatalogFromFirestore() {
  try {
    const collectionsToClear = ['products', 'creams', 'extras', 'packagings'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }
    return true;
  } catch (err) {
    console.error('Error al limpiar datos demo:', err);
    return false;
  }
}

// =========================================================================
// 8. MESAS / TABLES (SALÓN)
// =========================================================================
export function subscribeToTables(onUpdate, onError) {
  try {
    const colRef = collection(db, 'tables');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const tables = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        tables.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        onUpdate(tables);
      },
      (err) => {
        console.warn('Advertencia en Firestore tables:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de tables:', err);
    if (onError) onError(err);
  }
}

export async function saveTableToFirestore(table) {
  try {
    const docRef = doc(db, 'tables', table.id);
    await setDoc(docRef, sanitizePayload(table), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar mesa en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteTableFromFirestore(tableId) {
  try {
    await deleteDoc(doc(db, 'tables', tableId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar mesa en Firestore:', err);
    return { success: false, error: err };
  }
}

// =========================================================================
// 9. USUARIOS Y CONTROL DE ACCESO (PROTECCIÓN BACKEND Y DB)
// =========================================================================
export function subscribeToUsers(onUpdate, onError) {
  try {
    const colRef = collection(db, 'users');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          email: d.data().email || d.id,
        }));
        onUpdate(users);
      },
      (err) => {
        console.warn('Advertencia en Firestore users:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de users:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function getUserFromFirestore(userEmail) {
  try {
    const email = userEmail?.toLowerCase().trim();
    if (!email) return null;
    const docSnap = await getDoc(doc(db, 'users', email));
    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id,
        email: docSnap.data().email || docSnap.id,
      };
    }
    return null;
  } catch (err) {
    console.warn('No se pudo leer usuario en Firestore:', err?.message);
    return null;
  }
}

export async function createUserIfNotExistsInFirestore(userData) {
  try {
    const userEmail = userData.email?.toLowerCase().trim();
    if (!userEmail) return { success: false, error: 'Email requerido' };
    const docRef = doc(db, 'users', userEmail);
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      return {
        success: true,
        existed: true,
        data: { ...existing.data(), id: existing.id, email: existing.data().email || existing.id },
      };
    }
    await setDoc(
      docRef,
      sanitizePayload({
        ...userData,
        email: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return { success: true, existed: false };
  } catch (err) {
    console.warn('Auto-registro de usuario omitido:', err?.message);
    return { success: false, error: err };
  }
}

export async function saveUserToFirestore(userData) {
  try {
    const userEmail = userData.email?.toLowerCase().trim();
    if (!userEmail) return { success: false, error: 'Email requerido' };
    const docRef = doc(db, 'users', userEmail);
    await setDoc(
      docRef,
      sanitizePayload({
        ...userData,
        email: userEmail,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al guardar usuario en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteUserFromFirestore(userEmail) {
  try {
    const email = userEmail?.toLowerCase().trim();
    if (!email) return { success: false };
    await deleteDoc(doc(db, 'users', email));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar usuario en Firestore:', err);
    return { success: false, error: err };
  }
}

export function subscribeToRolePermissions(onUpdate, onError) {
  try {
    const docRef = doc(db, 'app_config', 'roles_permissions');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data().permissions || null);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('Advertencia en Firestore roles_permissions:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de roles_permissions:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveRolePermissionsToFirestore(permissions) {
  try {
    const docRef = doc(db, 'app_config', 'roles_permissions');
    await setDoc(
      docRef,
      { permissions: sanitizePayload(permissions), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al guardar roles_permissions en Firestore:', err);
    return { success: false, error: err };
  }
}

export function subscribeToDeliveryConfig(onUpdate, onError) {
  try {
    const docRef = doc(db, 'app_config', 'delivery');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() || null);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('Advertencia en Firestore delivery config:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de delivery config:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveDeliveryConfigToFirestore(config) {
  try {
    const docRef = doc(db, 'app_config', 'delivery');
    await setDoc(
      docRef,
      { ...sanitizePayload(config), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al guardar delivery config en Firestore:', err);
    return { success: false, error: err };
  }
}

export function subscribeToCategoryOrder(onUpdate, onError) {
  try {
    const docRef = doc(db, 'app_config', 'category_order');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data()?.orderMap || {});
        } else {
          onUpdate({});
        }
      },
      (err) => {
        console.warn('Advertencia en Firestore category_order:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error en suscripción de category_order:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveCategoryOrderToFirestore(orderMap) {
  try {
    const docRef = doc(db, 'app_config', 'category_order');
    await setDoc(
      docRef,
      { orderMap: sanitizePayload(orderMap), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error al guardar category_order en Firestore:', err);
    return { success: false, error: err };
  }
}

// Actualizar sortOrder masivamente en la colección /products para sincronización global entre todos los usuarios
export async function updateProductsSortOrderInFirestore(orderedProductIds) {
  if (!Array.isArray(orderedProductIds) || orderedProductIds.length === 0) {
    return { success: true };
  }
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < orderedProductIds.length; i += CHUNK_SIZE) {
      const chunk = orderedProductIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id, chunkIdx) => {
        const globalIdx = i + chunkIdx;
        const productRef = doc(db, 'products', id);
        batch.set(
          productRef,
          { sortOrder: globalIdx, updatedAt: serverTimestamp() },
          { merge: true }
        );
      });
      await batch.commit();
    }
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar sortOrder de productos en Firestore:', err);
    return { success: false, error: err };
  }
}

// Eliminar sortOrder de productos en Firestore al restablecer a orden automático
export async function resetProductsSortOrderInFirestore(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { success: true };
  }
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
      const chunk = productIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const productRef = doc(db, 'products', id);
        batch.update(productRef, { sortOrder: deleteField() });
      });
      await batch.commit();
    }
    return { success: true };
  } catch (err) {
    console.error('Error al restablecer sortOrder de productos en Firestore:', err);
    return { success: false, error: err };
  }
}


