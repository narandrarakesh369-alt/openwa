import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { NotificationSettings } from "@/components/admin/NotificationSettings";

const Notifications = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground">Configure SMS, email, and notification preferences</p>
        </div>
        <NotificationSettings />
      </div>
    </AuthenticatedLayout>
  );
};

export default Notifications;
