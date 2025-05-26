import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, serverTimestamp, query, where, FieldValue, deleteDoc, increment, WriteBatch } from 'firebase/firestore';
import { db } from './firebaseConfig'; // Import db from your Firebase config file

 
interface ProjectData {
  // Define the structure of your project data here
  // For example:
  name: string;
  description?: string;
  // Add other project properties
}

interface ProjectMaterial {
  id?: string; // Firestore document ID if material is stored as a subcollection
  materialId: string;
  materialName: string;
  materialUnit: string;
  budgetedQuantity: number;
  actualQuantity?: number; // Optional as it's set later
}

interface MovementItem {
 materialId: string;
 quantity: number;
 materialName: string; // Add name for movement history readability
 materialUnit: string; // Add unit for movement history readability
  // Other potential item details
}

interface Material {
  id: string;
  name: string;
  unit: string;
}
interface Project extends ProjectData {
  id: string;
}

const addProject = async (projectData: ProjectData) => {
  try {
    const docRef = await addDoc(collection(db, 'proyectos'), projectData);
    await updateDoc(docRef, { id: docRef.id }); // Add the document's ID as a field
    return docRef.id; // Return the ID of the newly added document
  } catch (e) {
    console.error('Error adding project: ', e);
    throw e; // Re-throw the error for handling in the component
  }
};

const getProjects = async (): Promise<Project[]> => {
  const projectsCollection = collection(db, 'proyectos');
  const projectSnapshot = await getDocs(projectsCollection);
  const projectList = projectSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];
  return projectList;
};

const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const projectRef = doc(db, 'proyectos', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      return {
        id: projectSnap.id,
        ...projectSnap.data()
      } as Project;
    } else {
      // doc.data() will be undefined in this case
      return null;
    }
  } catch (e) {
    console.error(`Error getting project ${projectId}: `, e);
    throw e;
  }
};

const updateProjectInFirestore = async (projectId: string, projectData: any) => {
  try {
    const projectRef = doc(db, 'proyectos', projectId);
    await updateDoc(projectRef, projectData);
  } catch (e) {
    console.error(`Error updating project ${projectId}: `, e);
    throw e;
  }
};

const completeProjectInFirestore = async (projectId: string, finalMaterials: ProjectMaterial[]) => {
  try {
    const projectRef = doc(db, 'proyectos', projectId);
    await updateDoc(projectRef, {
      status: 'COMPLETADO', // Assuming 'COMPLETADO' is the status value
      materials: finalMaterials, // Update materials with final quantities
      // You might want to add completion date or other fields here
    });
    // TODO: Add logic here or elsewhere to update global material stock based on finalMaterials
  } catch (e) {
    console.error(`Error completing project ${projectId}: `, e);
    throw e;
  }
};

const addMaterialToProjectInFirestore = async (projectId: string, materialDetails: ProjectMaterial) => {
  try {
    const projectRef = doc(db, 'proyectos', projectId);
    await updateDoc(projectRef, {
      materials: arrayUnion(materialDetails) // Add the new material object to the materials array
    });
  } catch (e) {
    console.error(`Error adding material to project ${projectId}: `, e);
    throw e;
  }
};

const removeMaterialFromProjectInFirestore = async (projectId: string, materialToRemove: ProjectMaterial) => {
  try {
    const projectRef = doc(db, 'proyectos', projectId);
    await updateDoc(projectRef, {
      materials: arrayRemove(materialToRemove) // Remove the material object from the materials array
    });
  } catch (e) {
    console.error(`Error removing material from project ${projectId}: `, e);
    throw e;
  }
};

const updateMaterialStock = async (materialId: string, updateData: { stock?: number; reserved?: number }) => {
 try {
    const materialRef = doc(db, 'materials', materialId); // Assuming 'materials' is your collection name for materials
 await updateDoc(materialRef, updateData);
  } catch (e) {
    console.error(`Error updating material ${materialId} stock: `, e);
 throw e;
  }
};

const processStockOutcome = async (itemsToOutcome: MovementItem[], outcomeDate: string, budgetTarget?: string) => {
  const batch: WriteBatch = writeBatch(db); // Use a batch for atomic updates

  try {
    // 1. Prepare material stock updates
 for (const item of itemsToOutcome) {
 const materialRef = doc(db, 'materials', item.materialId);
 // To update based on current value, we need to get the current value first.
 // For simple subtractions, you could potentially use FieldValue.increment,
 // but reading first allows for more complex logic (like checking stock before reducing).
 // A transaction would be safer for critical stock logic, but a batch is simpler
 // if optimistic updates are acceptable or validation is done client-side.
 // For this example, let's assume validation passed client-side and we just subtract.

 // Using updateDoc with a function that reads the document first would be ideal in a transaction,
 // but batches don't support reading within the batch.
 // A common pattern is to read materials before the batch, calculate new stock, then update.
 // For simplicity here, we'll just assume we are subtracting from 'stock'.
 // NOTE: For robust stock management, reading current stock *before* the batch/transaction is recommended.

 // For now, we will just update assuming the 'stock' field exists and is a number.
 // A safer approach might involve fetching all materials first outside the batch.

 // To update based on current stock, you'd typically read the material document first:
 // const materialSnap = await getDoc(materialRef);
 // if (!materialSnap.exists()) throw new Error(`Material ${item.materialId} not found`);
 // const currentStock = materialSnap.data().stock;
 // const newStock = currentStock - item.quantity;
 // batch.update(materialRef, { stock: newStock });

 // Simpler batch update assuming 'stock' field exists and is a number.
 // WARNING: This is not safe if multiple users are egresando stock of the same material concurrently.
 // A Cloud Function triggered on movement creation or a transaction in a secure backend is better for critical stock updates.
    batch.update(materialRef, { stock: increment(-item.quantity) }); // Using increment for simple subtraction
 }
 
 // 2. Add movement record to the batch
 // Note: Using addDoc within a batch requires getting a document reference first
 // by calling doc() on the collection and then using batch.set() or batch.update()
 // If you just need to add a new document with an auto-generated ID, addDoc is easier,
 // but it cannot be directly part of a write batch.
    const movementCollection = collection(db, 'movimientos');
 await addDoc(movementCollection, {
 items: itemsToOutcome,
      date: outcomeDate, // Consider using serverTimestamp() for accuracy
      budgetTarget: budgetTarget || '',
      // Add individual item details for movement history readability
      materialMovements: itemsToOutcome.map(item => ({
 materialId: item.materialId,
 materialName: item.materialName,
 quantity: -item.quantity, // Negative quantity for outcome
      })),
      type: 'egreso', // Add a type field to distinguish movements (income, outcome, etc.)
 timestamp: serverTimestamp(), // Add a server-side timestamp
 });

    await batch.commit(); // Commit the batch with both stock updates and movement record (if addDoc is moved inside)
  } catch (e) {
    console.error('Error processing stock outcome: ', e);
 throw e;
  }
};

const processStockIncome = async (itemsToIncome: MovementItem[], incomeDate: string) => {
  const batch: WriteBatch = writeBatch(db); // Use a batch for atomic updates
 
  try {
    // 1. Prepare material stock updates
 for (const item of itemsToIncome) {
 const materialRef = doc(db, 'materials', item.materialId);
      batch.update(materialRef, { stock: increment(item.quantity) }); // Increment the stock using increment
 }
    // Commit the batch (stock updates are atomic)
 await batch.commit();

    // 2. Add movement record (separate operation)
    const movementCollection = collection(db, 'movimientos');
    await addDoc(movementCollection, {
 items: itemsToIncome,
      date: incomeDate, // Consider using serverTimestamp() for accuracy
      // Add individual item details for movement history readability
      materialMovements: itemsToIncome.map(item => ({
 materialId: item.materialId,
 materialName: item.materialName,
 quantity: item.quantity, // Positive quantity for income (already handled by batch update)
      })),
 type: 'Ingreso', // Add a type field to distinguish movements
 timestamp: serverTimestamp(), // Add a server-side timestamp
 });

  } catch (e) {
    console.error('Error processing stock income: ', e);
    // Rollback the batch if needed (Firestore batches automatically roll back on error)
    throw e;
  }
};

 
const getMaterials = async (): Promise<Material[]> => {
  try {
    const materialsCollection = collection(db, 'materials');
    const materialsSnapshot = await getDocs(materialsCollection);
    const materialsList = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Material[];
    return materialsList;
  } catch (e) {
    console.error('Error getting materials: ', e);
    throw e;
  }
};

const addMaterialToFirestore = async (materialData: Omit<Material, 'id'>) => {
  try {
    // Ensure 'reserved' is included and defaults to 0
    const materialToAdd = { ...materialData, reserved: 0 };
    const docRef = await addDoc(collection(db, 'materials'), materialToAdd);
    return docRef.id; // Return the ID of the newly added document
  } catch (e) {
    console.error('Error adding material: ', e);
    throw e; // Re-throw the error for handling in the component
  }
};

const removeMaterialFromFirestore = async (materialId: string) => {
  try {
    await deleteDoc(doc(db, 'materials', materialId));

  } catch (e) {
    console.error(`Error removing material ${materialId}: `, e);
    throw e;
  }
};

export {
  db,
  addProject,
  getProjects,
  getProjectById,
  updateProjectInFirestore,
 completeProjectInFirestore, // TODO: Update this function to integrate stock logic
  addMaterialToProjectInFirestore,
 removeMaterialFromProjectInFirestore, // TODO: Update this function to integrate stock logic
 updateMaterialStock,
 processStockOutcome,
  processStockIncome,
  getMaterials,
  addMaterialToFirestore,
  removeMaterialFromFirestore
};