import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UploadCloud, File as FileIcon, X, CheckCircle, ChevronRight, Loader2, IndianRupee, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
  upiTransactionId: z.string().min(6, "Valid UTR required").optional().or(z.literal("")),
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
    defaultValues: { customerName: "", customerPhone: "", copies: 1, colorMode: "Black & White", paperSize: "A4", pages: 1, notes: "", upiTransactionId: "" },
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
      toast({ title: "✅ File uploaded successfully!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setIsUploading(false); }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, []);

  // Safe navigation function for moving to Step 3 after verifying Step 2 form values
  const handleNextToPayment = async () => {
    const isStep2Valid = await form.trigger(["customerName", "customerPhone", "pages", "copies"]);
    if (isStep2Valid) {
      if (!uploadedFile) {
        toast({ title: "Please upload a file first", variant: "destructive" });
        setStep(1);
        return;
      }
      setStep(3);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!uploadedFile) { 
      toast({ title: "Please upload a file first", variant: "destructive" }); 
      setStep(1);
      return; 
    }
    if (!values.upiTransactionId) { 
      form.setError("upiTransactionId", { message: "UTR/Transaction ID required to verify payment" }); 
      return; 
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create main print order record
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
          status: "payment_submitted" // Auto state trigger for Admin queue visibility
        }),
      });
      
      if (!orderRes.ok) throw new Error("Failed to create base order");
      const order = await orderRes.json();
      
      // 2. Patch transaction verification info
      const paymentRes = await fetch(`${API_URL}/api/orders/${order.id}/payment`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ upiTransactionId: values.upiTransactionId }) 
      });

      if (!paymentRes.ok) throw new Error("Order created but payment registration failed");

      toast({ title: "🎉 Order placed successfully!" });
      setLocation(`/order/${order.id}`);
    } catch (err: any) { 
      console.error(err);
      toast({ title: "Failed to create order", description: "Database communication breakdown.", variant: "destructive" }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi%3A%2F%2Fpay%3Fpa%3D8984740258%40fam%26pn%3DPrintShop%26am%3D${totalPrice}%26cu%3DINR&bgcolor=0f172a&color=ffffff`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Printer className="w-5 h-5" /></div>
            <span className="font-bold text-lg">PrintShop</span>
          </div>
          <div className="text-sm text-gray-400">Fast • Quality • Affordable</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Print Anything</h1>
          <p className="text-gray-400 text-lg">Upload • Configure • Pay • Pickup</p>
        </div>

        {/* Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-gray-500'}`}>{s}</div>
                {i < 2 && <div className={`h-0.5 w-12 transition-all ${step > s ? 'bg-blue-600' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">📄 Upload Your Document</h2>
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                className="border-2 border-dashed border-gray-700 rounded-xl p-14 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
                <UploadCloud className="w-14 h-14 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-white">Drop your file here</h3>
                <p className="text-gray-500 text-sm mb-6">PDF, DOCX, JPG, PNG — up to 50MB</p>
                <div className="relative inline-block">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} disabled={isUploading} />
                  <Button disabled={isUploading} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
                    {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Browse Files"}
                  </Button>
                </div>
              </div>
              {uploadedFile && (
                <div className="mt-4 p-4 bg-gray-800 rounded-xl flex items-center justify-between border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600/20 p-2 rounded-lg"><FileIcon className="w-6 h-6 text-blue-400" /></div>
                    <div>
                      <p className="font-medium text-white truncate max-w-[250px]">{uploadedFile.fileName}</p>
                      <p className="text-sm text-gray-500">{(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setUploadedFile(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></Button>
                </div>
              )}

              {/* Pricing Info */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[{ label: "Black & White", price: "₹2/page", color: "from-gray-700 to-gray-800" },
                  { label: "Color Print", price: "₹8/page", color: "from-blue-900 to-purple-900" },
                  { label: "Fast Pickup", price: "Same Day", color: "from-green-900 to-emerald-900" }].map((item) => (
                  <div key={item.label} className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border border-gray-700 text-center`}>
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-bold text-white">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form wrapper handles programmatic layout across Step 2 and Step 3 smoothly */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Step 2: Settings */}
              {step === 2 && (
                <div>
                  <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-white">⚙️ Print Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField control={form.control} name="customerName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Your Name</FormLabel>
                            <FormControl><Input placeholder="John Doe" {...field} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="customerPhone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Phone Number</FormLabel>
                            <FormControl><Input placeholder="9876543210" {...field} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="pages" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">Pages</FormLabel>
                              <FormControl><Input type="number" min={1} {...field} className="bg-gray-800 border-gray-700 text-white focus:border-blue-500" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="copies" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">Copies</FormLabel>
                              <FormControl><Input type="number" min={1} max={100} {...field} className="bg-gray-800 border-gray-700 text-white focus:border-blue-500" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <FormField control={form.control} name="colorMode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Color Mode</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-3">
                                {[{ value: "Black & White", label: "B&W", price: "₹2/page", icon: "⬜" },
                                  { value: "Color", label: "Color", price: "₹8/page", icon: "🎨" }].map((opt) => (
                                  <FormItem key={opt.value} className="flex items-center space-x-0 space-y-0">
                                    <FormControl><RadioGroupItem value={opt.value} className="peer sr-only" /></FormControl>
                                    <FormLabel className="w-full cursor-pointer border border-gray-700 rounded-xl p-4 flex flex-col items-center gap-1 hover:border-blue-500 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 transition-all">
                                      <span className="text-2xl">{opt.icon}</span>
                                      <span className="font-semibold text-white text-sm">{opt.label}</span>
                                      <span className="text-xs text-gray-400">{opt.price}</span>
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="paperSize" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Paper Size</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-3 gap-2">
                                {["A4", "A3", "Letter"].map((size) => (
                                  <FormItem key={size} className="flex items-center space-x-0 space-y-0">
                                    <FormControl><RadioGroupItem value={size} className="peer sr-only" /></FormControl>
                                    <FormLabel className="w-full text-center cursor-pointer border border-gray-700 rounded-lg p-3 text-sm font-medium text-gray-300 hover:border-blue-500 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-white transition-all">{size}</FormLabel>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Special Instructions</FormLabel>
                            <FormControl><Textarea placeholder="E.g., Please bind them together" {...field} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                  <div className="px-8 py-5 bg-gray-950/50 border-t border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Estimated Total</p>
                      <p className="text-4xl font-black text-white flex items-center"><IndianRupee className="w-7 h-7" />{totalPrice}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" type="button" onClick={() => setStep(1)} className="border-gray-700 text-gray-300 hover:bg-gray-800">Back</Button>
                      <Button type="button" onClick={handleNextToPayment} size="lg" className="bg-blue-600 hover:bg-blue-700 font-bold px-8 text-white">
                        Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-white">💳 Complete Payment</h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center border border-gray-700">
                      <p className="text-sm text-gray-400 mb-4">Scan to pay with any UPI app</p>
                      <div className="bg-white p-3 rounded-xl mb-4">
                        <img src={qrUrl} alt="UPI QR" className="w-48 h-48" />
                      </div>
                      <div className="bg-gray-900 px-4 py-2 rounded-lg w-full text-center border border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                        <p className="font-mono font-bold text-blue-400">8984740258@fam</p>
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-400">Amount to pay</p>
                        <p className="text-3xl font-black text-white flex items-center justify-center mt-1"><IndianRupee className="w-6 h-6" />{totalPrice}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Order Summary</h3>
                        <dl className="space-y-2 text-sm">
                          {[["File", uploadedFile?.fileName], ["Pages", pages], ["Copies", copies], ["Mode", colorMode]].map(([k, v]) => (
                            <div key={String(k)} className="flex justify-between">
                              <dt className="text-gray-400">{k}</dt>
                              <dd className="font-medium text-white truncate max-w-[150px]">{String(v)}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 border-t border-gray-700 font-bold text-base">
                            <dt className="text-white">Total</dt>
                            <dd className="text-white flex items-center"><IndianRupee className="w-4 h-4" />{totalPrice}</dd>
                          </div>
                        </dl>
                      </div>

                      <FormField control={form.control} name="upiTransactionId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 font-semibold">Enter UTR / Transaction ID</FormLabel>
                          <p className="text-xs text-gray-500">After paying, enter the 12-digit reference number</p>
                          <FormControl><Input placeholder="e.g. 301234567890" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 text-lg py-6" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" type="button" onClick={() => setStep(2)} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">Back</Button>
                        <Button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 font-bold text-white" size="lg" disabled={isSubmitting}>
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
      </main>
    </div>
  );
}
