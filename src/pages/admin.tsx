import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Search, CheckCircle, Printer, Check, Eye, Clock, Download, IndianRupee } from "lucide-react";
import { 
  useListOrders, 
  useGetStats, 
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function Admin() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, refetch: refetchStats } = useGetStats({
    query: { refetchInterval: 15000 }
  });

  const queryParams = statusFilter === "all" ? {} : { status: statusFilter };
  const { data: orders = [], isLoading, refetch: refetchOrders } = useListOrders(queryParams, {
    query: { refetchInterval: 15000 }
  });

  const updateStatus = useUpdateOrderStatus();

  const handleRefresh = () => {
    refetchStats();
    refetchOrders();
    toast({ title: "Data refreshed" });
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(queryParams) });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      toast({ title: "Order status updated" });
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handlePrint = (fileUrl: string) => {
    const url = `/api/files/${fileUrl.split('/').pop()}`;
    // Open in new tab and try to print
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "payment_submitted":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Verify Payment</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Confirmed</Badge>;
      case "printing":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Printing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Dashboard</h1>
          <p className="text-muted-foreground">Manage orders, payments, and print jobs.</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="hidden md:flex">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Printing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paidOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Printing Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.printingOrders}</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-primary">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{stats.totalRevenue}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border shadow-sm">
        <CardHeader className="p-0 border-b">
          <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <div className="px-6 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="payment_submitted">Needs Verification</TabsTrigger>
                <TabsTrigger value="confirmed">To Print</TabsTrigger>
                <TabsTrigger value="printing">Printing</TabsTrigger>
                <TabsTrigger value="completed">Done</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No orders found for this status.</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 flex flex-col xl:flex-row gap-6 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold">#{order.id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(order.createdAt), "PPp")}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1 truncate" title={order.fileName}>{order.fileName}</p>
                      <p className="text-xs text-muted-foreground mb-3">{order.pages || 1} pages • {order.copies} copies • {order.colorMode} • {order.paperSize}</p>
                      {order.notes && (
                        <p className="text-xs bg-muted p-2 rounded italic">"{order.notes}"</p>
                      )}
                    </div>

                    <div>
                      <p className="text-lg font-bold flex items-center mb-1"><IndianRupee className="w-4 h-4 mr-1" />{order.totalPrice}</p>
                      {order.upiTransactionId ? (
                        <div className="bg-blue-50/50 p-2 rounded border border-blue-100 mt-2 text-xs">
                          <p className="font-medium text-blue-800 mb-1">UTR Provided:</p>
                          <code className="bg-white px-1 py-0.5 rounded font-bold text-blue-900 select-all">{order.upiTransactionId}</code>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">No payment info yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row xl:flex-col gap-2 justify-end shrink-0 xl:min-w-[140px]">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => window.open(`/api/files/${order.fileUrl.split('/').pop()}`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View File
                    </Button>
                    
                    {order.status === "payment_submitted" && (
                      <Button 
                        size="sm" 
                        className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleUpdateStatus(order.id, "confirmed")}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Verify Pay
                      </Button>
                    )}
                    
                    {(order.status === "confirmed" || order.status === "payment_submitted") && (
                      <Button 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          handlePrint(order.fileUrl);
                          if (order.status !== "printing") {
                            handleUpdateStatus(order.id, "printing");
                          }
                        }}
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </Button>
                    )}

                    {order.status === "printing" && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full justify-start bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" /> Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
