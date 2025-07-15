import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, CheckCircle } from 'lucide-react';
import { InstructorClassForm } from '@/components/classes/InstructorClassForm';
import { classService, ClassSubmissionData } from '@/services/classService';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateClass() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: ClassSubmissionData) => {
    if (!user) {
      toast.error('You must be logged in to create a class');
      return;
    }

    setLoading(true);
    try {
      const newClass = await classService.createClass(
        data,
        user.id,
        user.user_metadata?.full_name || user.email || 'Unknown Instructor'
      );

      // Handle image uploads if any
      if (data.images && data.images.length > 0) {
        try {
          await classService.uploadClassImages(newClass.id, data.images);
        } catch (error) {
          console.error('Failed to upload images:', error);
          toast.error('Class created but some images failed to upload');
        }
      }

      setSubmitted(true);
      toast.success('Class created successfully! It will be reviewed before going live.');
    } catch (error) {
      console.error('Failed to create class:', error);
      toast.error('Failed to create class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Class Submitted Successfully!</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your class has been submitted for review. We'll notify you once it's approved and live on the platform.
                </p>
                <div className="space-y-4">
                  <Button onClick={() => navigate('/classes')} className="w-full">
                    Browse All Classes
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                    Go to Dashboard
                  </Button>
                  <Button variant="ghost" onClick={() => setSubmitted(false)} className="w-full">
                    Create Another Class
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
            Create a New Class
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
            Share your stepping expertise and teach students around the world. Fill out the form below to create your class.
          </p>
        </div>

        {/* Requirements Notice */}
        <Card className="mb-8 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-800">Class Requirements</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <ul className="list-disc list-inside space-y-2">
              <li>Classes must be related to stepping, line dancing, or partner dancing</li>
              <li>All classes are subject to review before being published</li>
              <li>You must provide clear class descriptions and requirements</li>
              <li>Profile picture and class images help attract more students</li>
              <li>Setting fair pricing helps build a strong learning community</li>
            </ul>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="max-w-4xl mx-auto">
          <InstructorClassForm 
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}