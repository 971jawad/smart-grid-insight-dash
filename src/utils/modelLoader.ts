
import * as tf from '@tensorflow/tfjs';

// Define model paths in the GitHub repository
const MODEL_PATHS = {
  'GRU': {
    modelJson: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/GRUmodel.json',
    weightsPath: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/GRU.group1-shard1of1.bin'
  },
  'Bidirectional LSTM': {
    modelJson: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/model%20(1).json',
    weightsPath: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/group1-shard1of1%20(1).bin'
  },
  'DeepAR': {
    modelJson: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/DeepARmodel.json',
    weightsPath: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/deepARweights.bin'
  }
};

// Model performance metrics (pre-evaluated)
export const MODEL_METRICS = {
  'Bidirectional LSTM': {
    mae: 0.06898624264029979,
    mse: 0.007775012006380435,
    r2: 0.8938474401619412
  },
  'GRU': {
    mae: 0.08247126781120773,
    mse: 0.00986050934169316,
    r2: 0.8653740589636583
  },
  'DeepAR': {
    mae: 0.07626980876023641,
    mse: 0.010184665602040177,
    r2: 0.8508961090804059
  }
};

// Cache loaded models to avoid reloading
const modelCache: Record<string, tf.LayersModel> = {};

/**
 * Load a TensorFlow.js model from the specified GitHub repository
 */
export const loadModel = async (modelName: string): Promise<tf.LayersModel | null> => {
  // Return cached model if available
  if (modelCache[modelName]) {
    console.log(`Using cached ${modelName} model`);
    return modelCache[modelName];
  }

  // Check if the model exists in our paths
  if (!MODEL_PATHS[modelName as keyof typeof MODEL_PATHS]) {
    console.error(`Model ${modelName} not found in available models`);
    return null;
  }

  try {
    console.log(`Loading ${modelName} model...`);
    const model = await tf.loadLayersModel(MODEL_PATHS[modelName as keyof typeof MODEL_PATHS].modelJson);
    console.log(`${modelName} model loaded successfully`);
    
    // Cache the model
    modelCache[modelName] = model;
    
    return model;
  } catch (error) {
    console.error(`Error loading ${modelName} model:`, error);
    return null;
  }
};

/**
 * Generate predictions using the specified model
 * This function would need to be adapted based on your model's input/output format
 */
export const generateModelPredictions = async (
  modelName: string, 
  data: number[][], 
  timeSteps: number = 72
): Promise<number[] | null> => {
  const model = await loadModel(modelName);
  
  if (!model) {
    return null;
  }
  
  try {
    // This is a placeholder implementation
    // You'll need to adapt this based on your specific model's input/output format
    const predictions: number[] = [];
    
    // Create a tensor with the appropriate shape for your model
    const input = tf.tensor(data);
    
    // Generate predictions for each time step
    for (let i = 0; i < timeSteps; i++) {
      // Make prediction
      const output = model.predict(input) as tf.Tensor;
      
      // Get the prediction value
      const predictionData = await output.data();
      const predictionValue = predictionData[0];
      
      // Add to predictions array
      predictions.push(predictionValue);
      
      // Clean up tensors to prevent memory leaks
      output.dispose();
      
      // Update input for next prediction if needed for your model
      // This part would depend on your specific model architecture
    }
    
    // Clean up tensors
    input.dispose();
    
    return predictions;
  } catch (error) {
    console.error(`Error generating predictions with ${modelName} model:`, error);
    return null;
  }
};
