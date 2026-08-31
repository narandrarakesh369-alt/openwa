import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Calendar } from "lucide-react";

interface Certificate {
  id: string;
  title: string;
  description: string;
  certificate_type: string;
  issue_date: string;
  file_url: string | null;
  profiles?: { full_name: string };
}

interface CertificateViewProps {
  studentId?: string;
}

export function CertificateView({ studentId }: CertificateViewProps) {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, [studentId]);

  useEffect(() => {
    if (filterType === "all") {
      setFilteredCertificates(certificates);
    } else {
      setFilteredCertificates(certificates.filter((c) => c.certificate_type === filterType));
    }
  }, [filterType, certificates]);

  const fetchCertificates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const targetStudentId = studentId || user?.id;

    const { data, error } = await supabase
      .from("certificates")
      .select("id, title, description, certificate_type, issue_date, file_url, student_id")
      .eq("student_id", targetStudentId)
      .order("issue_date", { ascending: false });

    if (error) {
      toast({ title: "Error fetching certificates", variant: "destructive" });
    } else {
      // Fetch student profile name separately
      if (data && data.length > 0 && targetStudentId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", targetStudentId)
          .maybeSingle();
        const enriched = data.map(cert => ({
          ...cert,
          profiles: profile || { full_name: "Unknown" },
        }));
        setCertificates(enriched as any);
        setFilteredCertificates(enriched as any);
      } else {
        setCertificates([]);
        setFilteredCertificates([]);
      }
    }
    setLoading(false);
  };

  const handleDownload = async (certificate: Certificate) => {
    if (certificate.file_url) {
      window.open(certificate.file_url, "_blank");
    } else {
      toast({ 
        title: "Certificate not available", 
        description: "This certificate hasn't been generated yet.",
        variant: "destructive" 
      });
    }
  };

  const getCertificateColor = (type: string) => {
    const colors: Record<string, string> = {
      academic: "bg-blue-100 text-blue-800 border-blue-300",
      participation: "bg-green-100 text-green-800 border-green-300",
      attendance: "bg-purple-100 text-purple-800 border-purple-300",
      excellence: "bg-yellow-100 text-yellow-800 border-yellow-300",
      performance: "bg-orange-100 text-orange-800 border-orange-300",
      other: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return <div className="text-center py-8">Loading certificates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" />
          My Certificates
        </h2>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="participation">Participation</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="excellence">Excellence</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCertificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No certificates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCertificates.map((certificate) => (
            <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Award className={`h-8 w-8 ${getCertificateColor(certificate.certificate_type)}`} />
                  <Badge className={getCertificateColor(certificate.certificate_type)}>
                    {certificate.certificate_type}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{certificate.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <Calendar className="h-3 w-3" />
                  {new Date(certificate.issue_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {certificate.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {certificate.description}
                  </p>
                )}
                <Button 
                  onClick={() => handleDownload(certificate)} 
                  className="w-full"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Certificate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
