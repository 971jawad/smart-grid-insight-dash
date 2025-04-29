
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authProvider';
import AuthDialog from './AuthDialog';

// Google Drive API key and Client ID
const API_KEY = 'AIzaSyBt7FcBjdZDHQs_Ty_vaAIjjXYrY5iWpMs'; // This is a public API key
const CLIENT_ID = '79027228020-22r8tme3crj0besg8mscate8jm3j6o5b.apps.googleusercontent.com'; // This is a public Client ID
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

interface GoogleDriveUploaderProps {
  onFileSelected: (file: File) => void;
}

const GoogleDriveUploader: React.FC<GoogleDriveUploaderProps> = ({ onFileSelected }) => {
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  const loadGoogleDriveAPI = () => {
    return new Promise((resolve, reject) => {
      // Check if the Google API script is already loaded
      if (window.gapi) {
        resolve(window.gapi);
        return;
      }

      // Load the Google API script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          }).then(() => {
            resolve(window.gapi);
          }).catch((error: any) => {
            console.error('Error initializing Google API client:', error);
            reject(error);
          });
        });
      };

      script.onerror = () => {
        console.error('Failed to load Google API script');
        reject(new Error('Failed to load Google API script'));
      };

      document.body.appendChild(script);
    });
  };

  const handleGoogleDriveSelect = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    setLoading(true);
    try {
      // Load Google API
      await loadGoogleDriveAPI();
      
      // Sign in to Google
      const googleAuth = window.gapi.auth2.getAuthInstance();
      if (!googleAuth.isSignedIn.get()) {
        await googleAuth.signIn();
      }

      // Create and show the picker
      await showPicker();
    } catch (error) {
      console.error('Google Drive error:', error);
      toast.error('Failed to connect to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const showPicker = () => {
    return new Promise((resolve, reject) => {
      // Load the picker API
      if (!window.google || !window.google.picker) {
        loadPickerAPI().then(() => {
          createAndShowPicker(resolve, reject);
        }).catch(reject);
      } else {
        createAndShowPicker(resolve, reject);
      }
    });
  };

  const loadPickerAPI = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js?onload=onApiLoad';
      script.async = true;
      script.defer = true;
      
      window.onApiLoad = () => {
        window.gapi.load('picker', { callback: resolve });
      };

      script.onerror = () => reject(new Error('Failed to load Google Picker API'));
      document.body.appendChild(script);
    });
  };

  const createAndShowPicker = (resolve: Function, reject: Function) => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const authResponse = authInstance.currentUser.get().getAuthResponse();
      const accessToken = authResponse.access_token;
      
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      view.setMimeTypes('text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
        .setAppId(CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .addView(view)
        .setDeveloperKey(API_KEY)
        .setCallback(pickerCallback)
        .build();
        
      picker.setVisible(true);
      resolve();
    } catch (error) {
      console.error('Error creating picker:', error);
      reject(error);
    }
  };

  const pickerCallback = async (data: any) => {
    if (data.action === 'picked') {
      const doc = data.docs[0];
      if (doc) {
        setLoading(true);
        try {
          // Download the file from Google Drive
          const accessToken = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (!response.ok) {
            throw new Error('Failed to download file from Google Drive');
          }
          
          const blob = await response.blob();
          const file = new File([blob], doc.name, { type: 'text/csv' });
          
          // Pass the file to the parent component
          onFileSelected(file);
          toast.success(`Selected "${doc.name}" from Google Drive`);
        } catch (error) {
          console.error('Error downloading file:', error);
          toast.error('Failed to download the selected file');
        } finally {
          setLoading(false);
        }
      }
    } else if (data.action === 'cancel') {
      toast.info('File selection cancelled');
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={handleGoogleDriveSelect} 
        disabled={loading}
        className="w-full mt-2"
      >
        {loading ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></span>
            Connecting to Google Drive...
          </>
        ) : (
          <>
            <svg viewBox="0 0 87.3 78" className="h-4 w-4 mr-2 fill-current">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3 1.4.8 2.9 1.2 4.5 1.2h47.4c1.6 0 3.1-.4 4.5-1.2 1.35-.8 2.5-1.9 3.3-3.3l3.85-6.65-70.7 0z" fill="#0066da"/>
              <path d="m45.95 12.8-18.6 32.2-20.75 35.85 70.7 0-20.75-35.85z" fill="#00ac47"/>
              <path d="m45.95 12.8 18.6 32.2 20.75 35.85-39.35-68.05z" fill="#ea4335"/>
              <path d="m45.95 12.8-39.35 68.05 20.75-35.85z" fill="#00832d"/>
              <path d="m6.6 66.85 39.35-68.05-18.6 32.2-20.75 35.85z" fill="#2684fc"/>
              <path d="m64.55 45 20.75 35.85-39.35-68.05z" fill="#ffba00"/>
            </svg>
            Select from Google Drive
          </>
        )}
      </Button>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};

// Add window augmentation
declare global {
  interface Window {
    gapi: any;
    google: any;
    onApiLoad: any;
  }
}

export default GoogleDriveUploader;
