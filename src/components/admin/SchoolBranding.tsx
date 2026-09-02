import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image as ImageIcon, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SchoolBranding = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
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
        .select("school_id, schools:school_id(name, logo_url, tagline)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.school_id) {
        setSchoolId(roleData.school_id);

        const schoolObj: any = roleData.schools;
        if (schoolObj) {
          setSchoolName(schoolObj.name || "");
          setLogoUrl(schoolObj.logo_url || "");
          setTagline(schoolObj.tagline || "");
        } else {
          // Direct fallback query
          const { data: schoolData } = await supabase
            .from("schools")
            .select("name, logo_url, tagline")
            .eq("id", roleData.school_id)
            .maybeSingle();

          if (schoolData) {
            setSchoolName(schoolData.name || "");
            setLogoUrl(schoolData.logo_url || "");
            setTagline(schoolData.tagline || "");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching school branding:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to optimize and convert an image file to a crisp, compressed Data URL
  const optimizeImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDimension = 400; // 400x400 max is optimal for logos
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Convert to compressed PNG data URL
          const optimizedDataUrl = canvas.toDataURL("image/png", 0.9);
          resolve(optimizedDataUrl);
        };
        img.onerror = () => reject(new Error("Failed to parse image file"));
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !schoolId) return;

    try {
      setUploading(true);

      // Process and optimize image to crisp Base64 PNG
      const optimizedUrl = await optimizeImageFile(file);
      const finalLogoUrl = optimizedUrl;

      setLogoUrl(finalLogoUrl);

      // Automatically update the database so the logo is immediately saved
      const { error: dbError } = await supabase
        .from("schools")
        .update({ logo_url: finalLogoUrl })
        .eq("id", schoolId);

      if (dbError) throw dbError;

      toast({
        title: "Logo uploaded & saved",
        description: "Your school logo has been updated and is now visible across the platform.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process logo. Please try another image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the file input so user can re-upload same file if needed
      event.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      setLogoUrl("");
      const { error } = await supabase
        .from("schools")
        .update({ logo_url: null })
        .eq("id", schoolId);

      if (error) throw error;

      toast({
        title: "Logo removed",
        description: "School logo has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        title: "Branding saved",
        description: "School logo and tagline have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving branding:", error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save branding. Please try again.",
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
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          School Branding
          {schoolName && <span className="text-sm font-normal text-muted-foreground">({schoolName})</span>}
        </CardTitle>
        <CardDescription>
          Customize your school logo and tagline. These will appear in the sidebar, student portal, report cards, and ID cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-3">
          <Label htmlFor="logo" className="font-semibold text-sm">School Logo</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Logo Preview Container */}
            <div className="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 p-2 overflow-hidden shadow-inner flex-shrink-0">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="School logo" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={() => {
                    console.warn("Image preview failed to load:", logoUrl);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 stroke-[1.5]" />
                  <span className="text-[11px]">No Logo</span>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] font-medium">Processing...</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="relative cursor-pointer overflow-hidden rounded-xl"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoUrl ? "Change Logo" : "Upload Logo"}
                  <input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>

                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploading || saving}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Supports PNG, JPG, WebP, SVG. Recommended: Square image (min 200x200px) with transparent background.
              </p>
            </div>
          </div>
        </div>

        {/* Tagline Section */}
        <div className="space-y-2">
          <Label htmlFor="tagline" className="font-semibold text-sm">School Tagline / Motto</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Empowering Minds, Inspiring Futures"
            maxLength={100}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            A short slogan displayed under the school name on official documents and portals (max 100 characters).
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button 
            onClick={handleSave} 
            disabled={saving || uploading}
            className="rounded-xl px-6"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Branding
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
