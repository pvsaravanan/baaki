import type { StaticImageData } from "next/image";
import axis from "@/assets/banks/Axis Bank.svg";
import bob from "@/assets/banks/Bank of Baroda.svg";
import boi from "@/assets/banks/Bank of India.svg";
import bom from "@/assets/banks/Bank of Maharashtra.svg";
import canara from "@/assets/banks/Canara Bank.svg";
import central from "@/assets/banks/Central Bank of India.svg";
import cub from "@/assets/banks/City Union Bank.svg";
import dbs from "@/assets/banks/DBS Bank.svg";
import federal from "@/assets/banks/Federal Bank.svg";
import fi from "@/assets/banks/Fi.svg";
import hdfc from "@/assets/banks/HDFC Bank.svg";
import hsbc from "@/assets/banks/HSBC.svg";
import icici from "@/assets/banks/ICICI Bank.svg";
import idbi from "@/assets/banks/IDBI Bank.svg";
import idfc from "@/assets/banks/IDFC First Bank.svg";
import iob from "@/assets/banks/IOB Bank.svg";
import indian from "@/assets/banks/Indian Bank.svg";
import indusind from "@/assets/banks/IndusInd Bank.svg";
import jupiter from "@/assets/banks/Jupiter Bank.svg";
import karnataka from "@/assets/banks/Karnataka Bank.svg";
import kotak from "@/assets/banks/Kotak Mahindra Bank.svg";
import pnb from "@/assets/banks/Punjab National Bank.svg";
import rbl from "@/assets/banks/RBL Bank.svg";
import sib from "@/assets/banks/South Indian Bank.svg";
import sc from "@/assets/banks/Standard Chartered Bank.svg";
import sbi from "@/assets/banks/State Bank of India.svg";
import uco from "@/assets/banks/UCO Bank.svg";
import union from "@/assets/banks/Union Bank.svg";
import yes from "@/assets/banks/Yes Bank.svg";

export const BANK_LOGOS: Readonly<Partial<Record<string, StaticImageData | string>>> = {
  axis, bob, boi, bom, canara, central, cub, dbs, federal, fi, hdfc, hsbc,
  icici, idbi, idfc, iob, indian, indusind, jupiter, karnataka, kotak, pnb, rbl, sib,
  sc, sbi, uco, union, yes,
};
