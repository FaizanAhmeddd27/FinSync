import { X, AlertTriangle, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useState, useRef } from 'react';
import Button from '../ui/Button';
import jsQR from 'jsqr';

export default function QRScannerModal({ isOpen, onClose, onScan }) {
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) { 
    if (cameraError) setCameraError(''); // Reset when closed
    return null;
  }

  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      try {
        const parsed = JSON.parse(code);
        onScan(parsed);
      } catch {
        onScan({ account: code });
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
           handleScan([{ rawValue: code.data }]);
        } else {
           alert('Could not detect QR code in this image. Please try another image.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan QR Code">
      <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-border">
        {cameraError ? (
          <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6 text-center">
             <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
             <p className="text-sm font-semibold">{cameraError}</p>
             <p className="text-xs text-muted-foreground mt-2">
               Please enter the account number manually.
             </p>
          </div>
        ) : (
          <Scanner 
            onScan={handleScan}
            onError={(err) => {
              if (err.name === 'NotAllowedError') setCameraError('Camera access denied by browser.');
              else if (err.name === 'NotFoundError') setCameraError('No camera found on this device.');
              else setCameraError('Error accessing camera.');
            }}
            formats={['qr_code']}
            components={{ audio: false, finder: true }}
            styles={{ container: { width: '100%', aspectRatio: '1/1' } }}
          />
        )}
        <div className="absolute top-4 right-4 bg-background/80 p-1 rounded-full cursor-pointer z-10" onClick={onClose}>
            <X className="w-5 h-5" />
        </div>
        <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm drop-shadow-md z-10 pointer-events-none">
          Point camera at the QR code
        </p>
      </div>

      <div className="mt-4 flex justify-center">
         <Button variant="outline" className="w-full relative" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload QR Image
         </Button>
         <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
         />
      </div>
    </Modal>
  );
}
