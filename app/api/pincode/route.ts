import { NextResponse } from "next/server";
import {
  inferStateFromPincode,
  isValidIndianPincode,
  normalizeIndianState,
} from "@/lib/indian-address";

interface IndiaPostOffice {
  Name: string;
  BranchType?: string;
  DeliveryStatus?: string;
  District?: string;
  Division?: string;
  Region?: string;
  Block?: string;
  State?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = (searchParams.get("pin") || "").trim();

  if (!isValidIndianPincode(pin)) {
    return NextResponse.json(
      { valid: false, error: "Please enter a valid 6-digit Indian PIN code." },
      { status: 400 }
    );
  }

  const prefixState = inferStateFromPincode(pin);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const json = await res.json();
      const first = Array.isArray(json) ? json[0] : null;
      const offices: IndiaPostOffice[] = Array.isArray(first?.PostOffice)
        ? first.PostOffice
        : [];

      if (first?.Status === "Success" && offices.length > 0) {
        const deliveryOffices = offices.filter(
          (po) => po.DeliveryStatus === "Delivery"
        );
        const primary = deliveryOffices[0] || offices[0];

        const apiState =
          normalizeIndianState(primary.State) || prefixState || "";
        const district =
          primary.District && primary.District !== "NA"
            ? primary.District
            : "";
        const division =
          primary.Division && primary.Division !== "NA"
            ? primary.Division
            : "";
        const block =
          primary.Block && primary.Block !== "NA" ? primary.Block : "";

        // Prefer clean city/town: if District is e.g. "Krishna" and Division is "Vijayawada",
        // or District is "Bengaluru", use District (and surface Division/Block if helpful)
        const city =
          district ||
          division ||
          (block && block !== "NA" ? block : "") ||
          primary.Name ||
          "";

        const seenNames = new Set<string>();
        const postOffices: string[] = [];
        for (const po of [...deliveryOffices, ...offices]) {
          const cleanName = (po.Name || "").trim();
          if (cleanName && !seenNames.has(cleanName.toLowerCase())) {
            seenNames.add(cleanName.toLowerCase());
            postOffices.push(cleanName);
          }
        }

        return NextResponse.json({
          valid: true,
          pincode: pin,
          state: apiState,
          city,
          district,
          division,
          postOffices: postOffices.slice(0, 10),
          source: "india-post",
        });
      }

      if (first?.Status === "Error" && !prefixState) {
        return NextResponse.json(
          {
            valid: false,
            error: "PIN code not found in India Post directory. Please double-check.",
          },
          { status: 404 }
        );
      }
    }
  } catch {
    // External India Post API unavailable or timed out — fall through to offline prefix map
  }

  return NextResponse.json({
    valid: true,
    pincode: pin,
    state: prefixState,
    city: "",
    district: "",
    division: "",
    postOffices: [],
    source: "prefix-fallback",
  });
}
