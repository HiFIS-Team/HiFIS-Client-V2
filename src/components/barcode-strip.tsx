import { Barcode } from "@/components/barcode";

export function BarcodeStrip() {
  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]">
      <Barcode className="h-12 w-full" />
    </div>
  );
}
