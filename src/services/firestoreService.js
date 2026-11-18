import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper para convertir Timestamps de Firestore a Date nativo
export function formatFirestoreDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === 'number') return new Date(val);
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

// Limpiar valores undefined antes de guardar en Firestore
function sanitizePayload(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
}

// =========================================================================
// 1. ÓRDENES / COMANDAS
// =========================================================================
export function subscribeToOrders(onUpdate, onError) {
  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ...data,
            id: docSnap.id,
            createdAt: formatFirestoreDate(data.createdAt),
          };
        });
        onUpdate(orders);
      },
      (err) => {
        console.warn('Advertencia en Firestore orders:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Error inicializando suscripción de órdenes:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveOrderToFirestore(orderData) {
  try {
    const orderDocId = orderData.orderNumber;
    const docRef = doc(db, 'orders', orderDocId);

    const cleanData = sanitizePayload({
      ...orderData,
      createdAt: orderData.createdAt instanceof Date ? Timestamp.fromDate(orderData.createdAt) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(docRef, cleanData, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al guardar comanda en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function updateOrderStatusInFirestore(orderNumber, newStatus) {
  try {
    const docRef = doc(db, 'orders', orderNumber);
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar estado en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function settleOrderInFirestore(orderNumber, paymentDetail) {
  try {
    const docRef = doc(db, 'orders', orderNumber);
    await updateDoc(docRef, {
      status: 'ENTREGADO',
      paymentStatus: 'PAID',
      payments: [
        {
          ...paymentDetail,
          paidAt: Timestamp.fromDate(new Date()),
        },
      ],
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error('Error al cerrar comanda en Firestore:', err);
    return { success: false, error: err };
  }
}

export async function deleteOrderFromFirestore(orderNumber) {
  try {
    const docRef = doc(db, 'orders', orderNumber);
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

export async function saveProductToFirestore(product) {
  try {
    const docRef = doc(db, 'products', product.id);
    const sanitizedProduct = { ...product };

    // REGLA ESTRICTA: Solo URLs web externas válidas (http/https).
    // NUNCA guardar Base64 ni blob en documentos de Firestore.
    let img = sanitizedProduct.image;
    if (typeof img === 'string') {
      img = img.trim();
      if (!img.startsWith('http://') && !img.startsWith('https://')) {
        img = '';
      }
    } else {
      img = '';
    }
    sanitizedProduct.image = img;

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
    const cleanData = sanitizePayload({
      ...expense,
      date: expense.date instanceof Date ? Timestamp.fromDate(expense.date) : serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    await setDoc(docRef, cleanData);
    return true;
  } catch (err) {
    console.error('Error al guardar gasto en Firestore:', err);
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
// 8. USUARIOS Y CONTROL DE ACCESO (PROTECCIÓN BACKEND Y DB)
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

