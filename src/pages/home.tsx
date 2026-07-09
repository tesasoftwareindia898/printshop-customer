import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState(1);
  const [colorMode, setColorMode] = useState("bw");
  const [paperSize, setPaperSize] = useState("a4");
  const [notes, setNotes] = useState("");
  const [utr, setUtr] = useState("");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratePerPage = colorMode === "color" ? 10 : 2; 
  const totalPrice = pages * copies * ratePerPage;

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        toast({ title: "Only PDF documents are allowed", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleOrderSubmit = async () => {
    if (!utr || utr.trim().length < 6) {
      toast({ title: "Please enter a valid payment UTR reference ID", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const fileExt = file!.name.split(".").pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("print-files")
        .upload(uniqueFileName, file!);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("print-files").getPublicUrl(uniqueFileName);
      const fileUrl = urlData.publicUrl;

      const { data: newOrder, error: dbError } = await supabase.from("orders").insert([{
        customerName,
        customerPhone,
        fileName: file!.name,
        fileUrl,
        copies,
        pages,
        colorMode: colorMode === "color" ? "Color" : "Black & White",
        paperSize: paperSize.toUpperCase(),
        totalPrice,
        upiTransactionId: utr,
        notes,
        status: "payment_submitted"
      }]).select().single();

      if (dbError) throw dbError;

      toast({ title: "Order submitted successfully!" });
      setLocation(`/order/${newOrder.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to process order. Please check data.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-xl mx-auto py-10 px-4">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-slate-900 text-white rounded-t-lg text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Neighborhood PrintShop</CardTitle>
          <CardDescription className="text-slate-400">Upload documents and pick up prints instantly</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Your Full Name</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Enter phone number" />
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center bg-slate-50 cursor-pointer relative">
                <Input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">{file ? file.name : "Click to upload your PDF file"}</p>
                <p className="text-xs text-slate-400 mt-1">Maximum allowed size: 25MB</p>
              </div>

              {file && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border text-sm">
                  <div>
                    <Label>Number of Pages</Label>
                    <Input type="number" min={1} value={pages} onChange={e => setPages(Math.max(1, Number(e.target.value)))} />
                  </div>
                  <div>
                    <Label>Number of Copies</Label>
                    <Input type="number" min={1} value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value)))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="mb-2 block">Color Mode</Label>
                    <RadioGroup value={colorMode} onValueChange={setColorMode} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="bw" id="bw" /><Label htmlFor="bw">B&W (₹2/page)</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="color" id="color" /><Label htmlFor="color">Color (₹10/page)</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="col-span-2">
                    <Label>Paper Size</Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="a4">A4 Standard</SelectItem><SelectItem value="legal">Legal Size</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Special Instructions (Optional)</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Double-sided, landscape..." />
                  </div>
                </div>
              )}

              <Button className="w-full font-bold bg-slate-900 text-white" disabled={!file || !customerName || !customerPhone} onClick={() => setStep(2)}>
                Proceed to Payment (Total: ₹{totalPrice})
              </Button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="bg-slate-50 p-4 rounded-lg border text-left">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">Order Summary</h3>
                <p className="text-sm flex justify-between"><span>File:</span> <span className="font-medium truncate max-w-[200px]">{file?.name}</span></p>
                <p className="text-sm flex justify-between"><span>Config:</span> <span className="font-medium">{copies} copies × {pages} pages</span></p>
                <div className="border-t my-2 pt-2 flex justify-between font-black text-base text-slate-900">
                  <span>Grand Total:</span>
                  <span className="flex items-center"><IndianRupee className="w-4 h-4" />{totalPrice}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase">Scan to Pay with any UPI App</p>
                <div className="inline-block p-3 border rounded-xl bg-white shadow-sm">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=8984740258@fam&pn=PrintShop&am=${totalPrice}&cu=INR`)}`} alt="Payment QR" />
                </div>
                <p className="font-mono text-sm font-bold text-slate-700">UPI ID: 8984740258@fam</p>
              </div>

              <div className="space-y-2 text-left">
                <Label>Enter 12-Digit UTR / Transaction ID</Label>
                <Input value={utr} onChange={e => setUtr(e.target.value)} placeholder="Enter transaction ref number" />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-bold" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
                <Button className="flex-1 font-bold bg-blue-600 text-white hover:bg-blue-700" onClick={handleOrderSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Submit Order"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
