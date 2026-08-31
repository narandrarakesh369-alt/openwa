import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { TransportManagement } from "@/components/admin/TransportManagement";

const Transport = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transport Management</h1>
          <p className="text-muted-foreground">Manage school transport routes, vehicles, and stops</p>
        </div>
        <TransportManagement />
      </div>
    </AuthenticatedLayout>
  );
};

export default Transport;
