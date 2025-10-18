import axios from 'axios';
import { createTest, createStudyPlan } from '@/services/api';

export const handleFileUpload = async (files: File[]) => {
  try {
    const formData = new FormData();
    
    // Upload files to a temporary storage or process them
    // This is a placeholder - you'll need to implement actual file upload logic
    const uploadPromises = files.map(async (file) => {
      formData.append('files', file);
      // You'll need to create this endpoint in your FastAPI backend
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.path;
    });

    const uploadedPaths = await Promise.all(uploadPromises);
    
    // Store paths for later use
    return uploadedPaths;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

export const generateTest = async (jsonPath: string, courseMaterialPath: string) => {
  try {
    const response = await createTest({
      json_path: jsonPath,
      course_material_json: courseMaterialPath
    });
    return response.items;
  } catch (error) {
    console.error('Error generating test:', error);
    throw error;
  }
};

export const generateStudyPlan = async (jsonPath: string, courseMaterialPath: string) => {
  try {
    const response = await createStudyPlan({
      json_path: jsonPath,
      course_material_json: courseMaterialPath
    });
    return response.items;
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw error;
  }
};