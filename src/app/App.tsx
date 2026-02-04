import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Minus, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import logo from 'figma:asset/8e50eef1e8226df655a5d01b2793eb6e3ab6fef1.png';

type CalculationMode = 'units' | 'dose';
type DosingSchedule = 'once-daily' | 'twice-daily' | 'once-daily-5days' | '2-3x-week' | 'every-other-day' | 'custom';

interface ValidationErrors {
  vialSize?: string;
  waterVolume?: string;
  desiredDose?: string;
  bodyWeight?: string;
  mcgPerKg?: string;
  syringeUnits?: string;
  customDosesPerWeek?: string;
}

export default function App() {
  const [mode, setMode] = useState<CalculationMode>('units');
  const [vialSize, setVialSize] = useState<number>(0);
  const [waterVolume, setWaterVolume] = useState<number>(0);
  const [desiredDose, setDesiredDose] = useState<number>(0);
  const [syringeSize, setSyringeSize] = useState<number>(0.3);
  const [useWeight, setUseWeight] = useState<boolean>(false);
  const [bodyWeight, setBodyWeight] = useState<number>(0);
  const [mcgPerKg, setMcgPerKg] = useState<number>(0);
  const [syringeUnits, setSyringeUnits] = useState<number>(0);
  const [cycleDays, setCycleDays] = useState<number>(0);
  
  const [customVial, setCustomVial] = useState<string>('');
  const [customWater, setCustomWater] = useState<string>('');
  const [customDose, setCustomDose] = useState<string>('');

  // New fields for tracking and dosing schedule
  const [dosingSchedule, setDosingSchedule] = useState<DosingSchedule>('once-daily');
  const [customDosesPerWeek, setCustomDosesPerWeek] = useState<number>(0);
  const [daysBetweenDoses, setDaysBetweenDoses] = useState<number>(0);
  const [currentWeight, setCurrentWeight] = useState<number>(70);
  const [targetDose, setTargetDose] = useState<number>(250);
  const [dosesUsed, setDosesUsed] = useState<number>(0);

  // UI states
  const [supplyTrackingOpen, setSupplyTrackingOpen] = useState<boolean>(false);
  const [dosingScheduleOpen, setDosingScheduleOpen] = useState<boolean>(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState<boolean>(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [results, setResults] = useState({
    mainText: '--',
    syringeUnits: 0,
    totalMg: 0,
    warning: false,
    resultLabel: 'Result:',
    calculatedDose: 0
  });

  useEffect(() => {
    calculate();
  }, [mode, vialSize, waterVolume, desiredDose, syringeSize, useWeight, bodyWeight, mcgPerKg, syringeUnits, cycleDays]);

  const validateInputs = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (vialSize <= 0) newErrors.vialSize = 'Required - must be positive';
    if (waterVolume <= 0) newErrors.waterVolume = 'Required - must be positive';
    
    if (mode === 'units') {
      if (useWeight) {
        if (bodyWeight <= 0) newErrors.bodyWeight = 'Required - must be positive';
        if (mcgPerKg <= 0) newErrors.mcgPerKg = 'Required - must be positive';
      } else {
        if (desiredDose <= 0) newErrors.desiredDose = 'Required - must be positive';
      }
    } else {
      if (syringeUnits <= 0) newErrors.syringeUnits = 'Required - must be positive';
    }

    if (dosingSchedule === 'custom' && customDosesPerWeek <= 0) {
      newErrors.customDosesPerWeek = 'Required - must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculate = () => {
    if (!vialSize || !waterVolume) {
      setResults({
        mainText: '--',
        syringeUnits: 0,
        totalMg: 0,
        warning: false,
        resultLabel: 'Select vial size and water volume to begin',
        calculatedDose: 0
      });
      return;
    }

    const concentration = vialSize / waterVolume;
    const unitsPerUnit = (concentration * 1000) / 100;
    const maxUnits = syringeSize * 100;

    let mainText = '';
    let syrU = 0;
    let totalMg = 0;
    let resultLabel = 'Result:';
    let calculatedDose = 0;
    let warning = false;

    if (mode === 'units') {
      let activeDose = desiredDose;
      if (useWeight) {
        activeDose = bodyWeight * mcgPerKg;
        calculatedDose = activeDose;
      }
      
      if (activeDose > 0) {
        syrU = activeDose / unitsPerUnit;
        mainText = syrU.toFixed(1) + ' Units';
        totalMg = (activeDose * cycleDays) / 1000;
        resultLabel = useWeight ? `Calculated Dose: ${activeDose.toFixed(0)}mcg` : 'Units to Pull:';
        warning = syrU > maxUnits;
      }
    } else {
      if (syringeUnits > 0) {
        const actualDose = syringeUnits * unitsPerUnit;
        mainText = actualDose.toFixed(1) + ' mcg';
        totalMg = (actualDose * cycleDays) / 1000;
        resultLabel = 'Actual Dose:';
      }
    }

    setResults({
      mainText,
      syringeUnits: syrU,
      totalMg,
      warning,
      resultLabel,
      calculatedDose
    });

    validateInputs();
  };

  // Calculate new outputs
  const vialSizeMcg = vialSize * 1000;
  const effectiveDose = useWeight ? bodyWeight * mcgPerKg : desiredDose;
  const dosesInVial = vialSize > 0 && effectiveDose > 0 ? (vialSize * 1000) / effectiveDose : 0;
  
  // Calculate dosing schedule values
  const getDosesPerWeek = (): number => {
    switch (dosingSchedule) {
      case 'once-daily': return 7;
      case 'twice-daily': return 14;
      case 'once-daily-5days': return 5;
      case '2-3x-week': return 2.5;
      case 'every-other-day': return 3.5;
      case 'custom': return customDosesPerWeek;
      default: return 7;
    }
  };

  const dosesPerWeek = getDosesPerWeek();
  const daysSupply = dosesInVial > 0 && dosesPerWeek > 0 ? dosesInVial / (dosesPerWeek / 7) : 0;
  
  const getReorderDate = (): string => {
    if (daysSupply <= 0) return '--';
    const reorderDays = Math.floor(daysSupply - 7);
    if (reorderDays <= 0) return 'Order Now';
    const today = new Date();
    const reorderDate = new Date(today.getTime() + reorderDays * 24 * 60 * 60 * 1000);
    return reorderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getReorderDateObject = (): Date | null => {
    if (daysSupply <= 0) return null;
    const reorderDays = Math.floor(daysSupply - 7);
    if (reorderDays <= 0) return new Date();
    const today = new Date();
    return new Date(today.getTime() + reorderDays * 24 * 60 * 60 * 1000);
  };

  const formatDateTimeForICS = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const generateICSFile = (): string => {
    const reorderDate = getReorderDateObject();
    if (!reorderDate) return '';

    const dateStr = formatDateTimeForICS(reorderDate);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Peptide Calculator//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${dateStr}
DTSTAMP:${formatDateTimeForICS(new Date())}
SUMMARY:Reorder Peptide Supply
DESCRIPTION:Vial Size: ${vialSize}mg\\nCurrent Dose: ${effectiveDose}mcg\\nDays Supply: ${daysSupply.toFixed(1)} days\\nDosing Schedule: ${dosingSchedule.replace('-', ' ')}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: Reorder Peptide Supply
END:VALARM
END:VEVENT
END:VCALENDAR`;

    return icsContent;
  };

  const downloadICSFile = (filename: string) => {
    const icsContent = generateICSFile();
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const addToCalendar = async () => {
    setIsGeneratingCalendar(true);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    downloadICSFile('peptide-reorder-reminder.ics');
    setIsGeneratingCalendar(false);
  };

  const dosesRemaining = dosesInVial - dosesUsed;
  const progressPercentage = dosesInVial > 0 ? Math.max(0, Math.min(100, (dosesRemaining / dosesInVial) * 100)) : 0;
  const isSupplyDepleted = dosesRemaining <= 0 && dosesInVial > 0;

  const handleVialClick = (value: number) => {
    setVialSize(value);
    setCustomVial('');
  };

  const handleWaterClick = (value: number) => {
    setWaterVolume(value);
    setCustomWater('');
  };

  const handleDoseClick = (value: number) => {
    setDesiredDose(value);
    setCustomDose('');
  };

  const fillHeight = Math.min((results.syringeUnits / (syringeSize * 100)) * 100, 100);

  // Calculate syringe markings based on size
  const getSyringeMarkers = () => {
    const maxUnits = syringeSize * 100;
    const markerCount = syringeSize === 0.3 ? 6 : syringeSize === 0.5 ? 10 : 10;
    return Array.from({ length: markerCount + 1 }, (_, i) => 
      ((maxUnits / markerCount) * i).toFixed(0)
    );
  };

  const CollapsiblePanel = ({ 
    title, 
    isOpen, 
    onToggle, 
    children 
  }: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
  }) => (
    <div className="bg-white border border-[#d0d7f3] rounded-xl mb-3 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-[#e8eaf6] hover:bg-[#d5d8ef] transition-colors"
      >
        <span className="text-[15px] font-bold text-[#1a237e]">{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-[#1a237e]" /> : <ChevronDown className="w-5 h-5 text-[#1a237e]" />}
      </button>
      <div 
        className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ overflow: isOpen ? 'visible' : 'hidden' }}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
        <AlertCircle className="w-3 h-3" />
        <span>{message}</span>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white" style={{ fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div className="max-w-[650px] mx-auto px-4 py-6">
        {/* Logo */}
        <div className="text-center mb-4">
          <a 
            href="https://www.projectbiohacking.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img 
              src={logo} 
              alt="Project Biohacking" 
              className="max-w-full h-auto mx-auto"
              style={{ maxHeight: '80px' }}
            />
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold text-[#1a237e] m-0">Peptide Calculator</h2>
        </div>

        {/* Calculation Mode */}
        <div className="bg-[#e8eaf6] p-4 rounded-xl mb-5">
          <div className="text-[13px] font-bold mb-2">Calculation Mode:</div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => setMode('units')}
              className={`py-3 px-2 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                mode === 'units' ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Find Units
            </button>
            <button
              onClick={() => setMode('dose')}
              className={`py-3 px-2 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                mode === 'dose' ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Find Dose
            </button>
          </div>
        </div>

        {/* Vial Size */}
        <div className="mb-4">
          <label className="text-[13px] font-bold block mb-1">Vial Size (mg)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[5, 10, 15, 20].map((val) => (
              <button
                key={val}
                onClick={() => handleVialClick(val)}
                className={`py-3 px-1 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                  vialSize === val && !customVial ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {val}mg
              </button>
            ))}
          </div>
          <input
            type="number"
            value={customVial}
            onChange={(e) => {
              setCustomVial(e.target.value);
              const val = parseFloat(e.target.value);
              if (val) setVialSize(val);
            }}
            className={`w-full p-3 border rounded-lg text-base mt-2 ${errors.vialSize ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Custom mg"
          />
          <ErrorMessage message={errors.vialSize} />
        </div>

        {/* Water Volume */}
        <div className="mb-4">
          <label className="text-[13px] font-bold block mb-1">Water Volume (ml)</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((val) => (
              <button
                key={val}
                onClick={() => handleWaterClick(val)}
                className={`py-3 px-1 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                  waterVolume === val && !customWater ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {val}ml
              </button>
            ))}
          </div>
          <input
            type="number"
            value={customWater}
            onChange={(e) => {
              setCustomWater(e.target.value);
              const val = parseFloat(e.target.value);
              if (val) setWaterVolume(val);
            }}
            className={`w-full p-3 border rounded-lg text-base mt-2 ${errors.waterVolume ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Custom ml"
          />
          <ErrorMessage message={errors.waterVolume} />
        </div>

        {/* Mode-specific fields */}
        {mode === 'units' && (
          <>
            {/* Weight-based toggle */}
            <div className="bg-[#e3f2fd] p-3 rounded-lg mb-4">
              <label className="flex items-center text-[13px] font-bold cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={useWeight}
                  onChange={(e) => setUseWeight(e.target.checked)}
                  className="mr-2 w-[18px] h-[18px]"
                />
                Weight-Based Dose?
              </label>
            </div>

            {/* Weight-based inputs with smooth transition */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                useWeight ? 'max-h-[400px] opacity-100 mb-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-[#f0f4ff] p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-[13px] font-bold block mb-1">Body Weight (kg)</label>
                  <input
                    type="number"
                    value={bodyWeight || ''}
                    onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg text-base ${errors.bodyWeight ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter body weight"
                  />
                  <ErrorMessage message={errors.bodyWeight} />
                </div>
                <div>
                  <label className="text-[13px] font-bold block mb-1">Dose per kg (mcg/kg)</label>
                  <input
                    type="number"
                    value={mcgPerKg || ''}
                    onChange={(e) => setMcgPerKg(parseFloat(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg text-base ${errors.mcgPerKg ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter mcg per kg"
                  />
                  <ErrorMessage message={errors.mcgPerKg} />
                </div>
                {bodyWeight > 0 && mcgPerKg > 0 && (
                  <div className="bg-white p-3 rounded-lg border-2 border-[#1a237e]">
                    <div className="text-xs text-gray-600">Calculated Total Dose:</div>
                    <div className="text-xl font-bold text-[#1a237e]">{(bodyWeight * mcgPerKg).toFixed(0)} mcg</div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct dose input */}
            {!useWeight && (
              <div className="mb-4">
                <label className="text-[13px] font-bold block mb-1">Desired Dose (mcg)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleDoseClick(val)}
                      className={`py-3 px-1 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                        desiredDose === val && !customDose ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customDose}
                  onChange={(e) => {
                    setCustomDose(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (val) setDesiredDose(val);
                  }}
                  className={`w-full p-3 border rounded-lg text-base mt-2 ${errors.desiredDose ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Custom mcg"
                />
                <ErrorMessage message={errors.desiredDose} />
              </div>
            )}
          </>
        )}

        {mode === 'dose' && (
          <div className="mb-4">
            <label className="text-[13px] font-bold block mb-1">Units on Syringe (IU)</label>
            <input
              type="number"
              value={syringeUnits || ''}
              onChange={(e) => setSyringeUnits(parseFloat(e.target.value) || 0)}
              className={`w-full p-3 border rounded-lg text-base ${errors.syringeUnits ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter units"
            />
            <ErrorMessage message={errors.syringeUnits} />
          </div>
        )}

        {/* Syringe Size */}
        <div className="mb-4">
          <label className="text-[13px] font-bold block mb-1">Syringe Size (ml)</label>
          <div className="grid grid-cols-3 gap-2">
            {[0.3, 0.5, 1.0].map((val) => (
              <button
                key={val}
                onClick={() => setSyringeSize(val)}
                className={`py-3 px-1 border rounded-lg text-[13px] font-semibold text-center transition-colors min-h-[44px] ${
                  syringeSize === val ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {val}ml ({val * 100}U)
              </button>
            ))}
          </div>
        </div>

        {/* NEW OUTPUT SECTION */}
        {vialSize > 0 && waterVolume > 0 && effectiveDose > 0 && (
          <div className="bg-[#e3f2fd] border border-[#90caf9] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-gray-600 font-semibold mb-1">Vial Size (mcg)</div>
                <div className="text-lg font-bold text-[#1a237e]">{vialSizeMcg.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-600 font-semibold mb-1">Doses in Vial</div>
                <div className="text-lg font-bold text-[#1a237e]">{dosesInVial.toFixed(1)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Cycle Days */}
        <div className="bg-[#f3e5f5] p-3 rounded-lg mb-4">
          <label className="text-[13px] font-bold block mb-1">Cycle Days (Optional)</label>
          <input
            type="number"
            value={cycleDays || ''}
            onChange={(e) => setCycleDays(parseInt(e.target.value) || 0)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
            placeholder="Days"
          />
        </div>

        {/* Results */}
        <div className="bg-[#f5f7ff] border border-[#d0d7f3] rounded-xl p-5 mt-5 min-h-[180px]">
          {results.warning && (
            <div className="flex items-center gap-2 text-[#c62828] font-bold text-[13px] mb-3 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Warning: Dose exceeds syringe capacity!
            </div>
          )}

          <div className="bg-white p-4 rounded-lg mb-2 border border-gray-200">
            <div className="text-xs text-gray-600">{results.resultLabel}</div>
            <div className="text-[26px] font-extrabold text-[#1a237e]">{results.mainText}</div>
          </div>

          {cycleDays > 0 && results.totalMg > 0 && (
            <div className="bg-[#fff9c4] p-4 rounded-lg mb-2 border border-gray-200">
              <div className="text-xs text-gray-600">Total Needed for Cycle:</div>
              <div className="text-[26px] font-extrabold text-[#f57f17]">{results.totalMg.toFixed(2)} mg</div>
            </div>
          )}

          {/* Always visible syringe visualization */}
          <div className="text-center mt-4 border-t border-gray-300 pt-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Syringe Visualization</div>
            <div className="w-[80px] h-[240px] mx-auto my-3 relative border-[3px] border-[#1a237e] rounded-lg bg-gradient-to-b from-gray-50 to-white shadow-md">
              {/* Fill bar with animation */}
              <div 
                className="absolute bottom-0 w-full bg-gradient-to-t from-[#42a5f5] to-[#1976d2] transition-all duration-500 ease-out rounded-b-md"
                style={{ height: `${fillHeight}%` }}
              />
              
              {/* Syringe markers */}
              <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 pointer-events-none">
                {getSyringeMarkers().reverse().map((marker, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-[2px] w-3 bg-gray-800" />
                    <span className="text-[9px] text-gray-700 font-medium">{marker}</span>
                  </div>
                ))}
              </div>
              
              {/* Plunger indicator at top */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-[#1a237e] rounded-t-md shadow-sm" />
            </div>
            
            <div className="mt-3">
              <div className="font-bold text-[#1a237e] text-xl">
                {results.syringeUnits > 0 ? results.syringeUnits.toFixed(1) : '0.0'} Units
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {syringeSize}ml syringe (max {syringeSize * 100} units)
              </div>
            </div>
          </div>
        </div>

        {/* COLLAPSIBLE SECTIONS */}
        <div className="mt-6">
          {/* SUPPLY TRACKING PANEL */}
          <CollapsiblePanel 
            title="Supply Tracking" 
            isOpen={supplyTrackingOpen} 
            onToggle={() => setSupplyTrackingOpen(!supplyTrackingOpen)}
          >
            {isSupplyDepleted && (
              <div className="flex items-center gap-2 bg-red-50 border-l-4 border-red-600 p-4 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-bold text-red-600">Supply Depleted!</div>
                  <div className="text-sm text-red-600">Reorder immediately</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Doses Used */}
              <div>
                <label className="text-[13px] font-bold block mb-2">Doses Used</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDosesUsed(Math.max(0, dosesUsed - 1))}
                    className="w-12 h-12 bg-[#1a237e] text-white rounded-lg flex items-center justify-center hover:bg-[#0d1642] transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={dosesUsed}
                    onChange={(e) => setDosesUsed(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-base text-center font-bold"
                  />
                  <button
                    onClick={() => setDosesUsed(Math.min(dosesInVial, dosesUsed + 1))}
                    className="w-12 h-12 bg-[#1a237e] text-white rounded-lg flex items-center justify-center hover:bg-[#0d1642] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {dosesInVial > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] font-bold">Doses Remaining</span>
                    <span className="text-[13px] font-bold text-[#1a237e]">
                      {dosesRemaining.toFixed(1)} / {dosesInVial.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isSupplyDepleted 
                          ? 'bg-gradient-to-r from-red-600 to-red-800' 
                          : 'bg-gradient-to-r from-[#42a5f5] to-[#1976d2]'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className={`text-center mt-1 text-[12px] font-semibold ${isSupplyDepleted ? 'text-red-600' : 'text-gray-600'}`}>
                    {progressPercentage.toFixed(1)}% Remaining
                  </div>
                </div>
              )}

              {/* Current Weight */}
              <div>
                <label className="text-[13px] font-bold block mb-1">Current Weight (kg)</label>
                <input
                  type="number"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base"
                />
              </div>

              {/* Target Dose */}
              <div>
                <label className="text-[13px] font-bold block mb-1">Target Dose (mcg)</label>
                <input
                  type="number"
                  value={targetDose}
                  onChange={(e) => setTargetDose(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base"
                />
              </div>
            </div>
          </CollapsiblePanel>

          {/* DOSING SCHEDULE PANEL */}
          <CollapsiblePanel 
            title="Dosing Schedule" 
            isOpen={dosingScheduleOpen} 
            onToggle={() => setDosingScheduleOpen(!dosingScheduleOpen)}
          >
            <div className="space-y-4">
              {/* Dosing Schedule Dropdown */}
              <div>
                <label className="text-[13px] font-bold block mb-1">Dosing Schedule</label>
                <select
                  value={dosingSchedule}
                  onChange={(e) => setDosingSchedule(e.target.value as DosingSchedule)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white"
                >
                  <option value="once-daily">Once Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="once-daily-5days">Once Daily (5 days/week)</option>
                  <option value="2-3x-week">2-3x per week</option>
                  <option value="every-other-day">Every other day</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Doses Per Week */}
              {dosingSchedule === 'custom' && (
                <div 
                  className="transition-all duration-300 ease-in-out bg-[#f0f4ff] p-4 rounded-lg space-y-3"
                >
                  <div>
                    <label className="text-[13px] font-bold block mb-1">Doses Per Week</label>
                    <input
                      type="number"
                      value={customDosesPerWeek || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomDosesPerWeek(val);
                        if (val > 0) {
                          setDaysBetweenDoses(parseFloat((7 / val).toFixed(1)));
                        }
                      }}
                      className={`w-full p-3 border rounded-lg text-base ${errors.customDosesPerWeek ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter doses per week"
                    />
                    <ErrorMessage message={errors.customDosesPerWeek} />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold block mb-1">Days Between Doses</label>
                    <input
                      type="number"
                      value={daysBetweenDoses || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDaysBetweenDoses(val);
                        if (val > 0) {
                          setCustomDosesPerWeek(parseFloat((7 / val).toFixed(1)));
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base"
                      placeholder="Calculated automatically"
                    />
                  </div>
                </div>
              )}

              {/* Days Supply */}
              {daysSupply > 0 && (
                <>
                  <div className="bg-[#e3f2fd] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-600 font-semibold mb-1">Days Supply</div>
                    <div className="text-2xl font-bold text-[#1a237e]">
                      {daysSupply.toFixed(1)} days
                    </div>
                  </div>

                  {/* Reorder Date */}
                  <div className="bg-[#fff9c4] p-4 rounded-lg border border-[#ffd54f]">
                    <div className="text-[11px] text-gray-600 font-semibold mb-1">Reorder Date (7-day buffer)</div>
                    <div className="text-2xl font-bold text-[#f57f17]">
                      {getReorderDate()}
                    </div>
                  </div>

                  {/* Calendar Buttons */}
                  {getReorderDateObject() && (
                    <div className="space-y-2">
                      <button
                        onClick={addToCalendar}
                        disabled={isGeneratingCalendar}
                        className="w-full p-4 bg-[#1a237e] text-white rounded-lg flex items-center justify-center hover:bg-[#0d1642] transition-colors text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md min-h-[56px]"
                        title="Downloads calendar file - opens in your default calendar app"
                      >
                        {isGeneratingCalendar ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating calendar file...
                          </>
                        ) : (
                          <>
                            <Calendar className="w-5 h-5 mr-2" />
                            Add to Calendar
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-gray-500 text-center italic">
                        Downloads calendar file - opens in your default calendar app
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsiblePanel>

          {/* ADVANCED OPTIONS PANEL */}
          <CollapsiblePanel 
            title="Advanced Options" 
            isOpen={advancedOptionsOpen} 
            onToggle={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
          >
            <div className="space-y-4">
              <div className="bg-[#f5f5f5] p-4 rounded-lg">
                <p className="text-[13px] text-gray-600 mb-2">
                  Additional settings and calculations can be added here.
                </p>
                <div className="text-[11px] text-gray-500">
                  • Concentration: {vialSize > 0 && waterVolume > 0 ? (vialSize / waterVolume).toFixed(2) : '--'} mg/ml
                </div>
                <div className="text-[11px] text-gray-500">
                  • Units per Unit: {vialSize > 0 && waterVolume > 0 ? ((vialSize / waterVolume * 1000) / 100).toFixed(2) : '--'}
                </div>
              </div>
            </div>
          </CollapsiblePanel>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <a 
            href="https://www.projectbiohacking.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#1a237e] hover:text-[#0d1642] font-semibold text-sm transition-colors"
          >
            Visit Project Biohacking →
          </a>
        </div>
      </div>
    </div>
  );
}