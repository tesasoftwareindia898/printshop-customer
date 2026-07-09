import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { CheckCircle, Clock, File as FileIcon, Printer, IndianRupee, AlertCircle, ChevronLeft, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export function Order() {
  const params = useParams();
  const id = Number(params.id);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
      if (error || !data) throw new Error("Not found");
      setOrder(data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrder();
      const interval = setInterval(fetchOrder, 10000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Payment</Badge>;
      case "payment_submitted": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Payment Verifying</Badge>;
      case "confirmed": return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Payment Confirmed</Badge>;
      case "printing": return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Printing Now</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready for Pickup</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "payment_submitted": return <Clock className="w-12 h-12 text-blue-500" />;
      case "confirmed": return <CheckCircle className="w-12 h-12 text-indigo-500" />;
      case "printing": return <Printer className="w-12 h-12 text-purple-500" />;
      case "completed": return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "cancelled": return <XCircle className="w-12 h-12 text-red-500" />;
      default: return <AlertCircle className="w-12 h-12 text-gray-500" />;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Place another order
      </Link>

      <Card className="overflow-hidden border shadow-sm">
        <div className="bg-muted/30 p-8 text-center border-b">
          <div className="flex justify-center mb-4">{getStatusIcon(order?.status)}</div>
          <h1 className="text-2xl font-bold mb-2">Order #{order?.id}</h1>
          <p className="text-muted-foreground mb-4">Tracking active via live servers.</p>
          <div className="flex justify-center">{getStatusBadge(order?.status)}</div>
        </div>

        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Order Details</h3>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Customer</dt>
                  <dd className="font-medium text-foreground">{order?.customerName}</dd>
                  <dd className="text-foreground">{order?.customerPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">File</dt>
                  <dd className="font-medium flex items-center text-foreground truncate">
                    <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{order?.fileName}</span>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Print Options</h3>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Configuration</dt>
                  <dd className="font-medium text-foreground">{order?.copies} copies × {order?.pages || 1} pages</dd>
                  <dd className="text-foreground">{order?.colorMode}, {order?.paperSize}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Amount</dt>
                  <dd className="font-medium text-foreground flex items-center text-lg">
                    <IndianRupee className="w-4 h-4 mr-1" />{order?.totalPrice}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
