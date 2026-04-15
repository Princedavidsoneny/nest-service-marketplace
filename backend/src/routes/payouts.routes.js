import express from "express";
import axios from "axios";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { requireEnv } from "../utils/env.js";

const router = express.Router();

function paystackHeaders() {
  const secret = requireEnv("PAYSTACK_SECRET_KEY");
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

router.get("/payouts/banks", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: paystackHeaders(),
      params: {
        country: "nigeria",
        use_cursor: false,
        perPage: 100,
      },
    });

    const banks = (response.data?.data || []).map((bank) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
    }));

    return res.json({ banks });
  } catch (error) {
    console.error("GET /payouts/banks error:", error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || "Failed to load banks",
    });
  }
});

router.post("/payouts/resolve-account", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body || {};

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: "accountNumber and bankCode are required" });
    }

    const response = await axios.get("https://api.paystack.co/bank/resolve", {
      headers: paystackHeaders(),
      params: {
        account_number: String(accountNumber).trim(),
        bank_code: String(bankCode).trim(),
      },
    });

    return res.json({
      accountName: response.data?.data?.account_name || "",
      accountNumber: response.data?.data?.account_number || String(accountNumber).trim(),
      bankId: response.data?.data?.bank_id || null,
    });
  } catch (error) {
    console.error(
      "POST /payouts/resolve-account error:",
      error.response?.data || error.message
    );
    return res.status(400).json({
      error: error.response?.data?.message || "Could not verify account details",
    });
  }
});

router.get("/payouts/me", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const provider = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        role: "provider",
      },
      select: {
        id: true,
        name: true,
        email: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        payoutBusinessName: true,
        payoutVerified: true,
        paystackSubaccountCode: true,
        platformSplitPercent: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json(provider);
  } catch (error) {
    console.error("GET /payouts/me error:", error);
    return res.status(500).json({ error: "Failed to load payout profile" });
  }
});

 router.post("/payouts/setup", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber, accountName, businessName } = req.body || {};

    if (!bankName || !bankCode || !accountNumber || !accountName) {
      return res.status(400).json({
        error: "bankName, bankCode, accountNumber and accountName are required",
      });
    }

    const provider = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        role: "provider",
      },
      select: {
        id: true,
        name: true,
        email: true,
        platformSplitPercent: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const platformSplitPercent =
      Number(process.env.PAYSTACK_PLATFORM_PERCENT || provider.platformSplitPercent || 10);

    const subaccountResponse = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: String(businessName || provider.name).trim(),
        settlement_bank: String(bankCode).trim(),
        account_number: String(accountNumber).trim(),
        percentage_charge: platformSplitPercent,
        primary_contact_email: provider.email,
        primary_contact_name: provider.name,
      },
      {
        headers: paystackHeaders(),
      }
    );

    const subaccountCode = subaccountResponse.data?.data?.subaccount_code;
    if (!subaccountCode) {
      return res.status(400).json({ error: "Failed to create Paystack subaccount" });
    }

    const updated = await prisma.user.update({
      where: { id: provider.id },
      data: {
        bankName: String(bankName).trim(),
        bankCode: String(bankCode).trim(),
        accountNumber: String(accountNumber).trim(),
        accountName: String(accountName).trim(),
        payoutBusinessName: String(businessName || provider.name).trim(),
        payoutVerified: true,
        paystackSubaccountCode: subaccountCode,
        platformSplitPercent,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        payoutBusinessName: true,
        payoutVerified: true,
        paystackSubaccountCode: true,
        platformSplitPercent: true,
      },
    });

    return res.json({
      success: true,
      provider: updated,
    });
  } catch (error) {
    console.error("POST /payouts/setup error:", error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || "Failed to complete payout setup",
    });
  }
});
export default router;