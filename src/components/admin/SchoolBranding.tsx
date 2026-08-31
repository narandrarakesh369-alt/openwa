import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";

export const SchoolBranding = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolBranding();
  }, []);

  const fetchSchoolBranding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.school_id) {
        setSchoolId(roleData.school_id);

        const { data: schoolData } = await supabase
          .from("schools")
          .select("logo_url, tagline")
          .eq("id", roleData.school_id)
          .maybeSingle();

        if (schoolData) {
          setLogoUrl(schoolData.logo_url || "");
          setTagline(schoolData.tagline || "");
        }
      }
    } catch (error) {
      console.error("Error fetching school branding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !schoolId) return;

    try {
      setUploading(true);

      toast({
        title: "Processing image",
        description: "Loading AI model for background removal. This may take a moment on first use...",
      });

      // Load the image
      const imageElement = await loadImage(file);
      
      // Remove background
      let processedBlob: Blob;
      try {
        processedBlob = await removeBackground(imageElement);
        toast({
          title: "Background removed",
          description: "Uploading processed logo...",
        });
      } catch (bgError) {
        console.warn("Background removal failed, uploading original:", bgError);
        processedBlob = file;
        toast({
          title: "Using original image",
          description: "Background removal unavailable. Uploading original image...",
        });
      }
      
      // Create file from blob
      const fileName = `${schoolId}-logo-${Date.now()}.png`;
      const filePath = `school-logos/${fileName}`;
      const processedFile = new File([processedBlob], fileName, { type: 'image/png' });

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, processedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      
      toast({
        title: "Logo uploaded",
        description: "Your school logo has been saved. Don't forget to save your changes.",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!schoolId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("schools")
        .update({
          logo_url: logoUrl || null,
          tagline: tagline || null,
        })
        .eq("id", schoolId);

      if (error) throw error;

      toast({
        title: "Branding updated",
        description: "School logo and tagline have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving branding:", error);
      toast({
        title: "Save failed",
        description: "Failed to save branding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Branding</CardTitle>
        <CardDescription>
          Customize your school's logo and tagline. These will be visible to all students and staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="logo">School Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <div className="w-32 h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt="School logo" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            {!logoUrl && (
              <div className="w-32 h-32 border rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Recommended: Square image, at least 200x200px
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">School Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Excellence in Education"
            maxLength={100}
          />
          <p className="text-sm text-muted-foreground">
            A short motto or slogan for your school (max 100 characters)
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || uploading}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Branding"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
