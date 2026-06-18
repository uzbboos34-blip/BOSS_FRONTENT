import React, { createContext, useContext, useState } from 'react';
import { uploadApi } from '../api/axios';
import axios from 'axios';
import { supabaseUrl, supabaseKey } from '../api/supabase';

const UploadContext = createContext();

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState(() => {
    try {
      const saved = localStorage.getItem('active_uploads');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // If we reloaded while uploading, mark as error/interrupted
      return parsed.map(u => 
        u.status === 'uploading' 
          ? { ...u, status: 'error', error: 'Yuklash toʻxtatildi (sahifa yangilandi)' } 
          : u
      );
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  React.useEffect(() => {
    localStorage.setItem('active_uploads', JSON.stringify(uploads));
  }, [uploads]);

  const startUpload = async (url, formData, metadata, method = 'post', onComplete = null) => {
    const uploadId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    const newUpload = {
      id: uploadId,
      progress: 0,
      buffer: 10,
      metadata,
      status: 'uploading'
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      let finalFormData = formData;
      let isDirectSupabase = false;

      // Agar video bo'lsa, to'g'ridan-to'g'ri Supabase-ga yuklaymiz (backend limitlaridan qochish uchun)
      const file = formData.get('video') || formData.get('file');
      if (metadata.type === 'video' && file instanceof File) {
        isDirectSupabase = true;
        
        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

        const storageUrl = `${supabaseUrl}/storage/v1/object/NajotEdu/${filename}`;

        // To'g'ridan-to'g'ri Axios orqali yuklaymiz, shunda 100% HAQIQIY progress chiqadi
        await axios.post(storageUrl, file, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': file.type || 'video/mp4',
            'x-upsert': 'false'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 95) / progressEvent.total);
            setUploads(prev => prev.map(u => {
              if (u.id === uploadId) {
                return { ...u, progress: percentCompleted, buffer: Math.min(percentCompleted + 10, 100) };
              }
              return u;
            }));
          }
        });

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/NajotEdu/${filename}`;

        // Backend-ga faqat ma'lumotlarni yuboramiz (og'ir faylni emas)
        finalFormData = new FormData();
        for (let [key, value] of formData.entries()) {
          if (key !== 'video' && key !== 'file') {
            finalFormData.append(key, value);
          }
        }
        finalFormData.append('video_url', publicUrl);
        finalFormData.append('file_size', file.size);
        
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 95, buffer: 100 } : u
        ));
      }

      const axiosConfig = {
        _isUpload: true,
        onUploadProgress: (progressEvent) => {
          if (!isDirectSupabase) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploads(prev => prev.map(u => 
              u.id === uploadId ? { ...u, progress: percentCompleted, buffer: Math.min(percentCompleted + 10, 100) } : u
            ));
          }
        }
      };

      const response = method.toLowerCase() === 'put' 
        ? await uploadApi.put(url, finalFormData, axiosConfig)
        : await uploadApi.post(url, finalFormData, axiosConfig);

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u
      ));

      if (onComplete) {
        onComplete(response.data);
      }

      // Auto-remove after 10 seconds (increased from 5 for visibility)
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
      }, 10000);

      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'error', error: error.response?.data?.message || error.message } : u
      ));
      return { error };
    }
  };

  return (
    <UploadContext.Provider value={{ uploads, setUploads, startUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  return useContext(UploadContext);
}
