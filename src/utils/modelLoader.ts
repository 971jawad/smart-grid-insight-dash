
import * as tf from '@tensorflow/tfjs';

// Define model paths in the GitHub repository
// Updated paths to use the correct filenames that actually exist in the repository
const MODEL_PATHS = {
  'GRU': {
    modelJson: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/GRUmodel.json',
    weightsPath: 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/GRU.weights.bin'
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

// Updated Excel data URL to use the specific file requested
export const EXCEL_DATA_URL = 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/monthly_data_interpolated.xlsx';

// Fallback URL in case primary data source fails
export const FALLBACK_DATA_URL = 'https://raw.githubusercontent.com/971jawad/MODELS-AND-WEIGHTS/main/monthly_consumption.csv';

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
    
    // Attempt to load the model with retry mechanism
    let attempt = 0;
    const maxAttempts = 3;
    let model: tf.LayersModel | null = null;
    
    while (attempt < maxAttempts && !model) {
      try {
        model = await tf.loadLayersModel(MODEL_PATHS[modelName as keyof typeof MODEL_PATHS].modelJson);
      } catch (err) {
        console.warn(`Attempt ${attempt + 1} failed to load ${modelName} model. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second before retry
        attempt++;
        
        if (attempt >= maxAttempts) {
          throw err;
        }
      }
    }
    
    if (model) {
      console.log(`${modelName} model loaded successfully`);
      // Cache the model
      modelCache[modelName] = model;
      return model;
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading ${modelName} model:`, error);
    return null;
  }
};

/**
 * Generate predictions using the specified model
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

/**
 * Fetch and parse data from GitHub
 * Implements a robust fetching strategy with retries and fallbacks
 */
export const fetchExcelData = async (): Promise<{date: string, consumption: number}[]> => {
  try {
    console.log('Fetching data from GitHub...');
    
    // Track attempts for primary and fallback sources
    let fetchSuccess = false;
    let data: any[] = [];
    
    // Try primary URL with multiple attempts
    for (let attempt = 0; attempt < 3 && !fetchSuccess; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for primary data source...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between retries
        }
        
        const response = await fetch(EXCEL_DATA_URL, { cache: 'no-store' });
        
        if (response.ok) {
          const csvText = await response.text();
          data = parseCSV(csvText);
          fetchSuccess = true;
          console.log('Successfully fetched data from primary source');
        } else {
          console.warn(`Primary data source failed with status: ${response.status}`);
        }
      } catch (err) {
        console.warn('Error fetching from primary source:', err);
      }
    }
    
    // If primary source failed, try fallback
    if (!fetchSuccess) {
      console.log('Trying fallback data source...');
      
      for (let attempt = 0; attempt < 3 && !fetchSuccess; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for fallback data source...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between retries
          }
          
          const response = await fetch(FALLBACK_DATA_URL, { cache: 'no-store' });
          
          if (response.ok) {
            const csvText = await response.text();
            data = parseCSV(csvText);
            fetchSuccess = true;
            console.log('Successfully fetched data from fallback source');
          } else {
            console.warn(`Fallback data source failed with status: ${response.status}`);
          }
        } catch (err) {
          console.warn('Error fetching from fallback source:', err);
        }
      }
    }
    
    // If both sources failed, generate mock data
    if (!fetchSuccess || data.length === 0) {
      console.warn('All data sources failed, generating mock data');
      return generateMockData();
    }
    
    // Format the data to match our ConsumptionData structure
    return data.map((item: any) => ({
      date: item.date || `${item.year}-${String(item.month).padStart(2, '0')}-01`,
      consumption: Number(item.consumption) || Number(item.value),
      isPrediction: false
    }));
  } catch (error) {
    console.error('Error in fetchExcelData:', error);
    // Return mock data in case of error
    return generateMockData();
  }
};

/**
 * Parse CSV data from string
 */
const parseCSV = (csvText: string): any[] => {
  try {
    // Split by lines
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV data has insufficient lines');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Parse data rows
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          // Try to convert to number if possible
          const value = values[index];
          const numValue = Number(value);
          row[header] = isNaN(numValue) ? value : numValue;
        });
        result.push(row);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

/**
 * Generate mock data as fallback
 */
const generateMockData = (): {date: string, consumption: number}[] => {
  console.log('Generating mock historical data');
  const data: {date: string, consumption: number}[] = [];
  
  // Generate mock data from 2020 to current month (not future)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  for (let year = 2020; year <= currentYear; year++) {
    // For current year, only generate up to current month
    const monthLimit = year === currentYear ? currentMonth : 12;
    
    for (let month = 1; month <= monthLimit; month++) {
      // Basic seasonal pattern with random variations
      const baseValue = 5000;
      const yearlyTrend = (year - 2020) * 200; // Increasing trend year by year
      const seasonalFactor = Math.sin((month - 1) / 12 * Math.PI * 2); // Seasonal variation
      const randomFactor = Math.random() * 500 - 250; // Random noise
      
      const consumption = Math.round(baseValue + yearlyTrend + seasonalFactor * 1000 + randomFactor);
      
      data.push({
        date: `${year}-${month.toString().padStart(2, '0')}-01`,
        consumption: Math.max(100, consumption) // Ensure positive consumption
      });
    }
  }
  
  return data;
};
