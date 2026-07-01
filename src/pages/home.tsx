import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UploadCloud, File as FileIcon, X, CheckCircle, ChevronRight, Loader2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const API_URL = import.meta.env.VITE_API_URL || "";

const formSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z.string().min(10, "Valid phone number required"),
  copies: z.coerce.number().min(1).max(100),
  colorMode: z.enum(["Black & White", "Color"]),
  paperSize: z.enum(["A4", "A3", "Letter"]),
  pages: z.coerce.number().min(1, "Please enter number of pages"),
  notes: z.string().optional(),
  upiTransactionId: z.string().min(6, "Valid UTR / Transaction ID required").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function Home() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadedFile, setUploadedFile] = useState<{ fileName: string; fileUrl: string; fileSize: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      copies: 1,
      colorMode: "Black & White",
      paperSize: "A4",
      pages: 1,
      notes: "",
      upiTransactionId: "",
    },
  });

  const copies = form.watch("copies");
  const colorMode = form.watch("colorMode");
  const pages = form.watch("pages");

  const pricePerPage = colorMode === "Color" ? 8 : 2;
  const totalPrice = (pages || 1) * pricePerPage * (copies || 1);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedFile({ fileName: data.fileName, fileUrl: data.fileUrl, fileSize: data.fileSize });
      setStep(2);
      toast({ title: "File uploaded successfully" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (!uploadedFile) { toast({ title: "Please upload a file first", variant: "destructive" }); return; }
    if (step === 2) { setStep(3); return; }
    if (step === 3 && !values.upiTransactionId) {
      form.setError("upiTransactionId", { message: "UTR / Transaction ID is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          fileName: uploadedFile.fileName,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.fileSize,
          copies: values.copies,
          colorMode: values.colorMode,
          paperSize: values.paperSize,
          pages: values.pages,
          pricePerPage,
          totalPrice,
          notes: values.notes,
        }),
      });
      if (!orderRes.ok) throw new Error("Failed to create order");
      const order = await orderRes.json();

      if (values.upiTransactionId) {
        await fetch(`${API_URL}/api/orders/${order.id}/payment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upiTransactionId: values.upiTransactionId }),
        });
      }
      toast({ title: "Order placed successfully!" });
      setLocation(`/order/${order.id}`);
    } catch (err) {
      toast({ title: "Failed to create order", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + " MB";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3D8984740258%40fam%26pn%3DPrintShop%26am%3D${totalPrice}%26cu%3DINR`;

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Fast, Quality Printing</h1>
        <p className="text-lg text-muted-foreground">Upload your document, configure settings, and pickup at the shop.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s, i) => (<>
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</div>
            {i < 2 && <div className={`h-1 w-12 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </>))}
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Upload Document</h2>
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
              className="border-2 border-dashed rounded-xl p-12 text-center hover:bg-muted/50 transition-colors border-muted-foreground/25">
              <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Drag and drop your file here</h3>
              <p className="text-muted-foreground text-sm mb-6">PDF, DOCX, JPG, PNG up to 50MB</p>
              <div className="relative">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                  disabled={isUploading} />
                <Button disabled={isUploading} type="button" size="lg">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? "Uploading..." : "Browse Files"}
                </Button>
              </div>
            </div>
            {uploadedFile && (
              <div className="mt-6 p-4 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileIcon className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium truncate max-w-[300px]">{uploadedFile.fileName}</p>
                    <p className="text-sm text-muted-foreground">{formatSize(uploadedFile.fileSize)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setUploadedFile(null)}><X className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 2 && (
              <div>
                <div className="p-8 border-b">
                  <h2 className="text-2xl font-semibold mb-6">Print Options</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="customerPhone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="pages" render={({ field }) => (
                        <FormItem><FormLabel>Pages in Document</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="copies" render={({ field }) => (
                        <FormItem><FormLabel>Number of Copies</FormLabel><FormControl><Input type="number" min={1} max={100} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-6">
                      <FormField control={form.control} name="colorMode" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Color Mode</FormLabel><FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                            {[{ value: "Black & White", label: "Black & White", price: "₹2/page", bg: "bg-gray-200" },
                              { value: "Color", label: "Color", price: "₹8/page", bg: "bg-gradient-to-tr from-blue-400 via-green-400 to-yellow-400" }].map((opt) => (
                              <FormItem key={opt.value} className="flex items-center space-x-0 space-y-0">
                                <FormControl><RadioGroupItem value={opt.value} className="peer sr-only" /></FormControl>
                                <FormLabel className="w-full font-normal cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                                  <div className={`w-8 h-8 rounded ${opt.bg} border border-gray-300`} />
                                  <span>{opt.label}</span>
                                  <span className="text-xs text-muted-foreground">{opt.price}</span>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="paperSize" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Paper Size</FormLabel><FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-3 gap-2">
                            {["A4", "A3", "Letter"].map((size) => (
                              <FormItem key={size} className="flex items-center space-x-0 space-y-0">
                                <FormControl><RadioGroupItem value={size} className="peer sr-only" /></FormControl>
                                <FormLabel className="w-full text-center font-normal cursor-pointer border rounded-lg p-3 hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">{size}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Special Instructions (Optional)</FormLabel><FormControl>
                          <Textarea placeholder="E.g., Please bind them together" {...field} />
                        </FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Total</p>
                    <p className="text-3xl font-bold flex items-center"><IndianRupee className="w-6 h-6 mr-1" />{totalPrice}</p>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" type="button" onClick={() => setStep(1)}>Back</Button>
                    <Button type="button" onClick={() => form.handleSubmit(onSubmit)()} size="lg">
                      Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-8">
                <h2 className="text-2xl font-semibold mb-6">Complete Payment</h2>
                <div className="grid md:grid-cols-2 gap-12 items-start">
                  <div className="bg-white p-6 rounded-xl border flex flex-col items-center text-center">
                    <p className="text-sm font-medium text-gray-500 mb-2">Scan to pay with any UPI app</p>
                    <img src={qrUrl} alt="UPI QR Code" className="w-[250px] h-[250px] object-contain mb-4 rounded-lg" />
                    <div className="bg-gray-50 px-4 py-2 rounded w-full">
                      <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                      <p className="font-mono font-medium text-gray-900">8984740258@fam</p>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
                      <p className="text-2xl font-bold text-gray-900 flex items-center justify-center"><IndianRupee className="w-5 h-5 mr-1" />{totalPrice}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                      <h3 className="font-medium text-primary mb-2 flex items-center"><CheckCircle className="w-5 h-5 mr-2" /> Order Summary</h3>
                      <dl className="space-y-2 text-sm text-muted-foreground mt-4">
                        <div className="flex justify-between"><dt>File</dt><dd className="font-medium text-foreground truncate max-w-[150px]">{uploadedFile?.fileName}</dd></div>
                        <div className="flex justify-between"><dt>Pages</dt><dd className="font-medium text-foreground">{pages}</dd></div>
                        <div className="flex justify-between"><dt>Copies</dt><dd className="font-medium text-foreground">{copies}</dd></div>
                        <div className="flex justify-between"><dt>Mode</dt><dd className="font-medium text-foreground">{colorMode}</dd></div>
                        <div className="pt-2 border-t flex justify-between font-bold text-foreground mt-2 text-base">
                          <dt>Total</dt><dd className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{totalPrice}</dd>
                        </div>
                      </dl>
                    </div>
                    <FormField control={form.control} name="upiTransactionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Enter UTR / Transaction ID</FormLabel>
                        <CardDescription>After paying, enter the 12-digit transaction reference number to confirm your order.</CardDescription>
                        <FormControl><Input placeholder="e.g. 301234567890" className="text-lg py-6" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-4 pt-4">
                      <Button variant="outline" type="button" onClick={() => setStep(2)} className="flex-1" size="lg">Back</Button>
                      <Button type="submit" className="flex-[2]" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Order
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
