import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Bus, MapPin, Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: string;
  route_name: string;
  route_number: string;
  start_point: string;
  end_point: string;
  distance_km: number | null;
  estimated_time_minutes: number | null;
  monthly_fee: number | null;
  is_active: boolean;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
  conductor_name: string | null;
  conductor_phone: string | null;
  route_id: string | null;
  is_active: boolean;
}

interface Stop {
  id: string;
  route_id: string;
  stop_name: string;
  stop_order: number;
  pickup_time: string | null;
  drop_time: string | null;
}

export const TransportManagement = () => {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form states
  const [routeForm, setRouteForm] = useState({
    route_name: "",
    route_number: "",
    start_point: "",
    end_point: "",
    distance_km: "",
    estimated_time_minutes: "",
    monthly_fee: "",
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: "",
    vehicle_type: "Bus",
    capacity: "40",
    driver_name: "",
    driver_phone: "",
    conductor_name: "",
    conductor_phone: "",
    route_id: "",
  });

  const [stopForm, setStopForm] = useState({
    stop_name: "",
    stop_order: "",
    pickup_time: "",
    drop_time: "",
    route_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        await Promise.all([
          fetchRoutes(roleData.school_id),
          fetchVehicles(roleData.school_id),
        ]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async (schoolId: string) => {
    const { data } = await supabase
      .from("transport_routes")
      .select("*")
      .eq("school_id", schoolId)
      .order("route_number");
    if (data) setRoutes(data);
  };

  const fetchVehicles = async (schoolId: string) => {
    const { data } = await supabase
      .from("transport_vehicles")
      .select("*")
      .eq("school_id", schoolId)
      .order("vehicle_number");
    if (data) setVehicles(data);
  };

  const fetchStops = async (routeId: string) => {
    const { data } = await supabase
      .from("transport_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("stop_order");
    if (data) setStops(data);
  };

  const handleAddRoute = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("transport_routes").insert({
        school_id: schoolId,
        route_name: routeForm.route_name,
        route_number: routeForm.route_number,
        start_point: routeForm.start_point,
        end_point: routeForm.end_point,
        distance_km: routeForm.distance_km ? parseFloat(routeForm.distance_km) : null,
        estimated_time_minutes: routeForm.estimated_time_minutes ? parseInt(routeForm.estimated_time_minutes) : null,
        monthly_fee: routeForm.monthly_fee ? parseFloat(routeForm.monthly_fee) : null,
      });

      if (error) throw error;

      toast({ title: "Route added successfully" });
      setIsRouteDialogOpen(false);
      setRouteForm({ route_name: "", route_number: "", start_point: "", end_point: "", distance_km: "", estimated_time_minutes: "", monthly_fee: "" });
      fetchRoutes(schoolId);
    } catch (error) {
      console.error("Error adding route:", error);
      toast({ title: "Failed to add route", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("transport_vehicles").insert({
        school_id: schoolId,
        vehicle_number: vehicleForm.vehicle_number,
        vehicle_type: vehicleForm.vehicle_type,
        capacity: parseInt(vehicleForm.capacity),
        driver_name: vehicleForm.driver_name || null,
        driver_phone: vehicleForm.driver_phone || null,
        conductor_name: vehicleForm.conductor_name || null,
        conductor_phone: vehicleForm.conductor_phone || null,
        route_id: vehicleForm.route_id || null,
      });

      if (error) throw error;

      toast({ title: "Vehicle added successfully" });
      setIsVehicleDialogOpen(false);
      setVehicleForm({ vehicle_number: "", vehicle_type: "Bus", capacity: "40", driver_name: "", driver_phone: "", conductor_name: "", conductor_phone: "", route_id: "" });
      fetchVehicles(schoolId);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast({ title: "Failed to add vehicle", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async () => {
    if (!stopForm.route_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("transport_stops").insert({
        route_id: stopForm.route_id,
        stop_name: stopForm.stop_name,
        stop_order: parseInt(stopForm.stop_order),
        pickup_time: stopForm.pickup_time || null,
        drop_time: stopForm.drop_time || null,
      });

      if (error) throw error;

      toast({ title: "Stop added successfully" });
      setIsStopDialogOpen(false);
      setStopForm({ stop_name: "", stop_order: "", pickup_time: "", drop_time: "", route_id: stopForm.route_id });
      fetchStops(stopForm.route_id);
    } catch (error) {
      console.error("Error adding stop:", error);
      toast({ title: "Failed to add stop", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!schoolId) return;
    try {
      const { error } = await supabase.from("transport_routes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Route deleted" });
      fetchRoutes(schoolId);
    } catch (error) {
      console.error("Error deleting route:", error);
      toast({ title: "Failed to delete route", variant: "destructive" });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!schoolId) return;
    try {
      const { error } = await supabase.from("transport_vehicles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Vehicle deleted" });
      fetchVehicles(schoolId);
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({ title: "Failed to delete vehicle", variant: "destructive" });
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
    <div className="space-y-6">
      <Tabs defaultValue="routes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Routes
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Bus className="h-4 w-4" /> Vehicles
          </TabsTrigger>
          <TabsTrigger value="stops" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Stops
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transport Routes</CardTitle>
                <CardDescription>Manage bus routes for student transportation</CardDescription>
              </div>
              <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Route</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Route</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Route Name</Label>
                        <Input value={routeForm.route_name} onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })} placeholder="Main Route" />
                      </div>
                      <div>
                        <Label>Route Number</Label>
                        <Input value={routeForm.route_number} onChange={(e) => setRouteForm({ ...routeForm, route_number: e.target.value })} placeholder="R001" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Point</Label>
                        <Input value={routeForm.start_point} onChange={(e) => setRouteForm({ ...routeForm, start_point: e.target.value })} placeholder="School" />
                      </div>
                      <div>
                        <Label>End Point</Label>
                        <Input value={routeForm.end_point} onChange={(e) => setRouteForm({ ...routeForm, end_point: e.target.value })} placeholder="City Center" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Distance (km)</Label>
                        <Input type="number" value={routeForm.distance_km} onChange={(e) => setRouteForm({ ...routeForm, distance_km: e.target.value })} />
                      </div>
                      <div>
                        <Label>Est. Time (min)</Label>
                        <Input type="number" value={routeForm.estimated_time_minutes} onChange={(e) => setRouteForm({ ...routeForm, estimated_time_minutes: e.target.value })} />
                      </div>
                      <div>
                        <Label>Monthly Fee</Label>
                        <Input type="number" value={routeForm.monthly_fee} onChange={(e) => setRouteForm({ ...routeForm, monthly_fee: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={handleAddRoute} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Route
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>From - To</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.route_number}</TableCell>
                      <TableCell>{route.route_name}</TableCell>
                      <TableCell>{route.start_point} - {route.end_point}</TableCell>
                      <TableCell>{route.distance_km ? `${route.distance_km} km` : "-"}</TableCell>
                      <TableCell>{route.monthly_fee ? `₹${route.monthly_fee}` : "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${route.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {route.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {routes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No routes found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vehicles</CardTitle>
                <CardDescription>Manage school transport vehicles</CardDescription>
              </div>
              <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Vehicle</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Vehicle Number</Label>
                        <Input value={vehicleForm.vehicle_number} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })} placeholder="KA01AB1234" />
                      </div>
                      <div>
                        <Label>Vehicle Type</Label>
                        <Select value={vehicleForm.vehicle_type} onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicle_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bus">Bus</SelectItem>
                            <SelectItem value="Van">Van</SelectItem>
                            <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Capacity</Label>
                        <Input type="number" value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} />
                      </div>
                      <div>
                        <Label>Assigned Route</Label>
                        <Select value={vehicleForm.route_id} onValueChange={(v) => setVehicleForm({ ...vehicleForm, route_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Driver Name</Label>
                        <Input value={vehicleForm.driver_name} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Driver Phone</Label>
                        <Input value={vehicleForm.driver_phone} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={handleAddVehicle} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Vehicle
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                      <TableCell>{vehicle.vehicle_type}</TableCell>
                      <TableCell>{vehicle.capacity}</TableCell>
                      <TableCell>{vehicle.driver_name || "-"}</TableCell>
                      <TableCell>{vehicle.driver_phone || "-"}</TableCell>
                      <TableCell>{routes.find(r => r.id === vehicle.route_id)?.route_name || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteVehicle(vehicle.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No vehicles found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stops">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Route Stops</CardTitle>
                <CardDescription>Manage pickup and drop points for each route</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Select value={selectedRoute || ""} onValueChange={(v) => { setSelectedRoute(v); fetchStops(v); setStopForm({ ...stopForm, route_id: v }); }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select route" /></SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedRoute}><Plus className="mr-2 h-4 w-4" /> Add Stop</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Stop</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Stop Name</Label>
                        <Input value={stopForm.stop_name} onChange={(e) => setStopForm({ ...stopForm, stop_name: e.target.value })} placeholder="Main Market" />
                      </div>
                      <div>
                        <Label>Stop Order</Label>
                        <Input type="number" value={stopForm.stop_order} onChange={(e) => setStopForm({ ...stopForm, stop_order: e.target.value })} placeholder="1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pickup Time</Label>
                          <Input type="time" value={stopForm.pickup_time} onChange={(e) => setStopForm({ ...stopForm, pickup_time: e.target.value })} />
                        </div>
                        <div>
                          <Label>Drop Time</Label>
                          <Input type="time" value={stopForm.drop_time} onChange={(e) => setStopForm({ ...stopForm, drop_time: e.target.value })} />
                        </div>
                      </div>
                      <Button onClick={handleAddStop} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Stop
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRoute ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Stop Name</TableHead>
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Drop Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stops.map((stop) => (
                      <TableRow key={stop.id}>
                        <TableCell>{stop.stop_order}</TableCell>
                        <TableCell>{stop.stop_name}</TableCell>
                        <TableCell>{stop.pickup_time || "-"}</TableCell>
                        <TableCell>{stop.drop_time || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {stops.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No stops found for this route</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Select a route to view and manage stops</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
