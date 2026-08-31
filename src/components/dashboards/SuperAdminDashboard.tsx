import { SchoolManagementEnhanced } from "@/components/super-admin/SchoolManagementEnhanced";
import { MembershipManagement } from "@/components/super-admin/MembershipManagement";
import { TierPricingManagement } from "@/components/super-admin/TierPricingManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SuperAdminDashboard = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage all schools and monitor platform activity</p>
      </div>

      <Tabs defaultValue="schools" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="pricing">Tier Pricing</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schools">
          <SchoolManagementEnhanced />
        </TabsContent>
        
        <TabsContent value="pricing">
          <TierPricingManagement />
        </TabsContent>
        
        <TabsContent value="memberships">
          <MembershipManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
