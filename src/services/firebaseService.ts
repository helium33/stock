import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, ItemType } from '../lib/utils';

// Generic functions for CRUD operations
export const getItems = async <T>(
  collectionName: string,
  store: Store,
  additionalFilters?: { field: string; value: any }[]
): Promise<T[]> => {
  try {
    let q = query(
      collection(db, collectionName),
      where('store', '==', store)
    );
    
    if (additionalFilters && additionalFilters.length > 0) {
      additionalFilters.forEach(filter => {
        q = query(q, where(filter.field, '==', filter.value));
      });
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as unknown as T));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    throw error;
  }
};

export const addItem = async <T extends DocumentData>(
  collectionName: string,
  store: Store,
  data: T
): Promise<string> => {
  try {
    const item = {
      ...data,
      store,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding ${collectionName}:`, error);
    throw error;
  }
};

export const updateItem = async <T extends DocumentData>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    throw error;
  }
};

export const deleteItem = async (
  collectionName: string,
  id: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Error deleting ${collectionName}:`, error);
    throw error;
  }
};

export const recordSale = async (
  itemId: string,
  itemName: string,
  itemType: ItemType,
  category: string,
  store: Store,
  quantity: number,
  unitPrice: number
): Promise<void> => {
  try {
    await addDoc(collection(db, 'sales'), {
      itemId,
      itemName,
      itemType,
      category,
      store,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      date: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    throw error;
  }
};

export const getSalesHistory = async (
  filters?: {
    store?: Store;
    itemType?: ItemType;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> => {
  try {
    let q = query(
      collection(db, 'sales'),
      orderBy('date', 'desc')
    );
    
    if (filters?.store) {
      q = query(q, where('store', '==', filters.store));
    }
    
    if (filters?.itemType) {
      q = query(q, where('itemType', '==', filters.itemType));
    }
    
    if (filters?.startDate) {
      q = query(q, where('date', '>=', filters.startDate));
    }
    
    if (filters?.endDate) {
      q = query(q, where('date', '<=', filters.endDate));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching sales history:', error);
    throw error;
  }
};