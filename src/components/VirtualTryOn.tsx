import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, Upload, RefreshCw, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';
import { useDropzone } from 'react-dropzone';
import { Progress } from './ui/progress';

interface VirtualTryOnProps {
  outfitImageUrl?: string;
}

export const VirtualTryOn = ({ outfitImageUrl }: VirtualTryOnProps) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        setUserImage(imageData);
        stopCamera();
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });

  const processImage = async () => {
    if (!userImage) return;

    setProcessing(true);
    setProgress(0);

    try {
      // Load user image
      setProcessingStatus('Loading image...');
      setProgress(20);
      
      const img = await loadImage(await (await fetch(userImage)).blob());
      
      // Remove background
      setProcessingStatus('Removing background...');
      setProgress(40);
      
      const processedBlob = await removeBackground(img, (status) => {
        setProcessingStatus(status);
        if (status.includes('Removing')) setProgress(60);
        if (status.includes('Finalizing')) setProgress(80);
      });
      
      // Create URL for processed image
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
      setProgress(100);
      
      toast({
        title: "Success!",
        description: "Background removed successfully. You can now overlay the outfit."
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProcessingStatus('');
      setProgress(0);
    }
  };

  const downloadResult = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = 'virtual-tryon-result.png';
      link.click();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (processedImage) {
        URL.revokeObjectURL(processedImage);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Virtual Try-On (AR Preview)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Take a photo or upload an image to see how this outfit looks on you
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        {showCamera && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button onClick={capturePhoto} size="lg">
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Upload or Camera Start */}
        {!userImage && !showCamera && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Drop your photo here...'
                  : 'Drag & drop a photo, or click to browse'}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button onClick={startCamera} className="w-full" size="lg">
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          </div>
        )}

        {/* User Image Preview */}
        {userImage && !processedImage && (
          <div className="space-y-4">
            <img
              src={userImage}
              alt="Your photo"
              className="w-full rounded-lg"
            />
            <div className="flex gap-2">
              <Button
                onClick={processImage}
                disabled={processing}
                className="flex-1"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process & Try On'
                )}
              </Button>
              <Button
                onClick={() => setUserImage(null)}
                variant="outline"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {processing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {processingStatus}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Processed Result */}
        {processedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={processedImage}
                alt="Processed result"
                className="w-full rounded-lg"
              />
              {outfitImageUrl && (
                <img
                  src={outfitImageUrl}
                  alt="Outfit overlay"
                  className="absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-70"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadResult} className="flex-1" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => {
                  setUserImage(null);
                  setProcessedImage(null);
                }}
                variant="outline"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          <p>
            ⚠️ Note: This is a simplified AR preview. For best results, use good lighting
            and stand in front of a plain background.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};