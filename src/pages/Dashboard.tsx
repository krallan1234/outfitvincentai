import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClothesUpload } from '@/components/ClothesUpload';
import { ClothesGallery } from '@/components/ClothesGallery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Wardrobe</h1>
          <p className="text-muted-foreground">Upload and manage your clothing items</p>
        </div>
        
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="gallery">My Clothes</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Clothing Collection</CardTitle>
                <CardDescription>
                  Browse all your uploaded clothing items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClothesGallery />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-6">
            <div className="flex justify-center">
              <ClothesUpload />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;