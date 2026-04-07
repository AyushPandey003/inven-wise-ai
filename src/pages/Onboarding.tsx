import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Loader2,
  Building2,
  Settings,
  Rocket,
  ChevronRight,
  CheckCircle2,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";

const INDUSTRIES = [
  "Retail & E-commerce",
  "Manufacturing",
  "Food & Beverage",
  "Healthcare & Pharma",
  "Electronics",
  "Automotive",
  "Fashion & Apparel",
  "Construction",
  "Agriculture",
  "Logistics & Distribution",
  "Other",
];

const COMPANY_SIZES = [
  "Just me",
  "2-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-1000 employees",
  "1000+ employees",
];

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
  { value: "SGD", label: "Singapore Dollar (S$)" },
  { value: "AED", label: "UAE Dirham (د.إ)" },
  { value: "BRL", label: "Brazilian Real (R$)" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// Step indicators
const STEPS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "config", label: "Configure", icon: Settings },
  { key: "ready", label: "Ready!", icon: Rocket },
];

export default function Onboarding() {
  const { tenant, updateCompanyInfo, updateBusinessConfig, skipOnboarding, onboardingStatus } = useAuth();
  const navigate = useNavigate();

  // Determine current step from onboarding status
  const getStepIndex = () => {
    switch (onboardingStatus) {
      case "company-info": return 0;
      case "admin-setup": return 0; // Already done at registration
      case "business-config": return 1;
      case "completed": return 2;
      default: return 0;
    }
  };

  const [step, setStep] = useState(getStepIndex);
  const [loading, setLoading] = useState(false);

  // Step 1: Company Info
  const [company, setCompany] = useState({
    companyName: tenant?.name || "",
    industry: "",
    companySize: "",
    country: "",
    phone: "",
  });

  // Step 2: Business Config
  const [config, setConfig] = useState({
    currency: "USD",
    timezone: "UTC",
  });

  const handleCompanySubmit = async () => {
    if (!company.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setLoading(true);
    try {
      await updateCompanyInfo(company);
      toast.success("Company info saved!");
      setStep(1);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSubmit = async () => {
    setLoading(true);
    try {
      await updateBusinessConfig(config);
      toast.success("Configuration complete!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await skipOnboarding();
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoDashboard = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set up your workspace</h1>
          <p className="text-muted-foreground">Just a few steps to get you started</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isCompleted = i < step;
            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div className={`w-12 h-0.5 mx-1 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                )}
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        {step === 0 && (
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Tell us about your company
              </CardTitle>
              <CardDescription>This helps us customize the experience for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Organization name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={company.companyName}
                  onChange={(e) => setCompany((p) => ({ ...p, companyName: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={company.industry}
                    onValueChange={(v) => setCompany((p) => ({ ...p, industry: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Company size</Label>
                  <Select
                    value={company.companySize}
                    onValueChange={(v) => setCompany((p) => ({ ...p, companySize: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g. United States"
                    value={company.country}
                    onChange={(e) => setCompany((p) => ({ ...p, country: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 890"
                    value={company.phone}
                    onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip for now
                </Button>
                <Button onClick={handleCompanySubmit} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configure your workspace
              </CardTitle>
              <CardDescription>Set defaults for your inventory management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default currency</Label>
                  <Select
                    value={config.currency}
                    onValueChange={(v) => setConfig((p) => ({ ...p, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={config.timezone}
                    onValueChange={(v) => setConfig((p) => ({ ...p, timezone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="font-medium text-sm">What happens next?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Your workspace will be created with a clean slate — no sample data
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Add your products, categories, warehouses and suppliers
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Invite team members to collaborate
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={handleConfigSubmit} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Complete setup
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-10 pb-10 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mx-auto">
                <Rocket className="h-10 w-10 text-green-500" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">You're all set! 🎉</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Your workspace is ready. Start by adding your first product or importing your inventory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Warehouses</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">14</p>
                  <p className="text-xs text-muted-foreground">Trial days left</p>
                </div>
              </div>

              <Button size="lg" onClick={handleGoDashboard} className="px-8">
                <Rocket className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
