"use client";

import { useState, useEffect, useRef } from "react";
import KnowledgeTab from "./knowledge-tab";
import WalletTab from "./wallet-tab";
import AppMarketplaceTab from "./app-marketplace-tab";
import { AlertCircleIcon, CloseIcon, ChatIcon } from "./icons";
import { usePrivy } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@privy-io/react-auth";
import ImageSelect from "./agent-model-select";

interface InitialData {
  id: string;
  userId: string;
  name: string;
  description: string;
  coreCapabilities: string;
  interactionStyle: string;
  analysisApproach: string;
  riskCommunication: string;
  responseFormat: string;
  limitationsDisclaimers: string;
  prohibitedBehaviors: string;
  knowledgeUpdates: string;
  responsePriorityOrder: string;
  styleGuide: string;
  specialInstructions: string;
}

interface AgentFormProps {
  initialData?: InitialData | null;
}

export default function AgentForm({ initialData = null }: AgentFormProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const { user } = usePrivy();
  const params = useParams();
  const router = useRouter();
  const [selectedModelValue, setSelectedModelValue] = useState('option1');
  const options = [
    {
      value: 'option1',
      label: 'claude-3-5-sonnet-20240620',
      imageUrl: '/images/providers/claude.svg'
    },
    {
      value: 'option2',
      label: 'deepseek-chat',
      imageUrl: '/images/providers/deepseek.svg'
    },
    {
      value: 'option3',
      label: 'gpt-4-turbo',
      imageUrl: '/images/providers/openai-white-logomark.svg'
    },
    {
      value: 'option4',
      label: 'mistral-large-latest',
      imageUrl: '/images/providers/mistral.svg'
    }    
  ];

  type FormDataKeys = keyof typeof defaultFormData;

  const textAreaFields: {
    name: FormDataKeys;
    label: string;
    rows?: number;
    required?: boolean;
    placeholder: string;
  }[] = [
    {
      name: "description",
      label: "Description",
      rows: 4,
      required: true,
      placeholder: 'e.g., "A crypto analyst providing insights on market trends"',
    },    
    {
      name: "coreCapabilities",
      label: "Core Capabilities & Knowledge Domains",
      placeholder: `You possess deep expertise in:
    - Cryptocurrency markets and blockchain technology
    - Technical analysis and chart patterns
    - Fundamental analysis of crypto projects
    - DeFi protocols and mechanisms
    - Market sentiment analysis
    - Risk assessment and portfolio management
    - Regulatory frameworks in crypto
    - Macroeconomic factors affecting digital assets`,
    },
    {
      name: "interactionStyle",
      label: "Interaction Style",
      rows: 6,
      placeholder: `- Maintain a professional yet approachable tone
    - Be direct and concise in your responses
    - Use data to support your statements
    - Acknowledge uncertainty when present
    - Avoid hyperbole or excessive enthusiasm about market movements`,
    },
    {
      name: "analysisApproach",
      label: "Analysis Approach",
      rows: 6,
      placeholder: `- Always consider multiple perspectives
    - Start with broad context before diving into specifics
    - Clearly separate facts from opinions
    - Provide reasoning behind your conclusions
    - Use quantitative data when available`,
    },
    {
      name: "riskCommunication",
      label: "Risk Communication",
      rows: 6,
      placeholder: `- Always highlight potential risks alongside opportunities
    - Provide balanced perspectives on market situations
    - Remind users about the importance of due diligence
    - Never make definitive price predictions
    - Emphasize the importance of risk management`,
    },
    {
      name: "responseFormat",
      label: "Response Format",
      rows: 12,
      placeholder: `When analyzing assets or markets:

    1. Context
    - Provide relevant market context
    - Mention significant recent events
    - Highlight key metrics

    2. Analysis
    - Technical factors
    - Fundamental factors
    - Market sentiment
    - Risk factors

    3. Considerations
    - Potential opportunities
    - Potential risks
    - Important caveats

    4. Next Steps
    - Suggested areas for further research
    - Key metrics to monitor
    - Risk management considerations`,
    },
    {
      name: "limitationsDisclaimers",
      label: "Limitations & Disclaimers",
      rows: 6,
      placeholder: `- Clearly state when you don't have sufficient information
    - Remind users that your analysis is not financial advice
    - Acknowledge when market conditions are highly uncertain
    - Be transparent about the limitations of technical analysis
    - Emphasize the importance of personal research`,
    },
    {
      name: "prohibitedBehaviors",
      label: "Prohibited Behaviors",
      placeholder: `You must never:
    - Make specific price predictions
    - Provide direct trading advice
    - Recommend specific investment amounts
    - Guarantee returns or outcomes
    - Share personal opinions about future price movements
    - Encourage FOMO or panic selling
    - Promote specific cryptocurrencies or tokens`,
    },
    {
      name: "knowledgeUpdates",
      label: "Knowledge Updates",
      placeholder: `You should:
    - Base analysis on available historical data
    - Reference established patterns and indicators
    - Use widely accepted analytical frameworks
    - Acknowledge when market conditions are unprecedented
    - Stay within factual and analytical boundaries`,
    },
    {
      name: "specialInstructions",
      label: "Special Instructions",
      placeholder: `When analyzing trends:
    1. Start with longer timeframes before shorter ones
    2. Consider multiple indicators
    3. Look for confirming/conflicting signals
    4. Assess market context
    5. Consider external factors

    When discussing risks:
    1. Start with most significant risks
    2. Include both obvious and non-obvious factors
    3. Consider correlation risks
    4. Discuss potential impact severity
    5. Suggest risk mitigation strategies`,
    },
    {
      name: "responsePriorityOrder",
      label: "Response Priority Order",
      rows: 8,
      placeholder: `When analyzing trends:
    1. Safety and risk management
    2. Educational value
    3. Analytical depth
    4. Actionable insights
    5. Further research suggestions`,
    },
    {
      name: "styleGuide",
      label: "Style Guide",
      rows: 8,
      placeholder: `Use these formats for consistency:
    - Numbers: Use standard notation for large numbers (e.g., 1.5M, 2.3B)
    - Percentages: Include % symbol (e.g., 25%)
    - Time periods: Specify timezone when relevant
    - Data sources: Mention when citing specific sources
    - Technical terms: Define on first use
    - Confidence levels: Express explicitly (e.g., high, medium, low confidence)`,
    },
  ];

  const defaultFormData = {
    name: "",
    userId: user?.id,
    description: "",
    coreCapabilities: "",
    interactionStyle: "",
    analysisApproach: "",
    riskCommunication: "",
    responseFormat: "",
    limitationsDisclaimers: "",
    prohibitedBehaviors: "",
    knowledgeUpdates: "",
    styleGuide: "",
    specialInstructions: "",
    responsePriorityOrder: "",
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Initialize form with existing data if in edit mode
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const now = new Date().toISOString();
    const agentData = {
      ...formData,
      ...(initialData
        ? {
            updatedAt: now, // Only add updatedAt for existing agents
          }
        : {
            createdAt: now, // Add both for new agents
            updatedAt: now,
          }),
      userId: user?.id,
    };

    try {
      const url = initialData
        ? `/api/agents/${initialData?.userId}/${initialData.id}`
        : "/api/agents";

      const accessToken = await getAccessToken();

      const response = await fetch(url, {
        method: initialData ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,

        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${initialData ? "update" : "create"} agent`);
      }

      setSuccess(true);
      
      if (!initialData) {
        router.push("/agents"); // Redirect to agents list after creation
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
      if (initialData) {
        scrollToTop();
      }
      // redirect tp newly created agent
    }
  };

  const tabs = [
    { id: "config", label: "Configuration" },
    { id: "knowledge", label: "Knowledge Base" },
    { id: "wallet", label: "Wallet" },
    { id: "apps", label: "App Marketplace" },
  ];

  const goToChat = () => {
    router.push(`/agents/${params.userId}/${params.agentId}`);
  };
  
  return (
    <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-4 sm:p-6" ref={topRef}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {initialData ? initialData.name || "Edit Agent" : "Create New Agent"}
          </h1>
          
          {params.agentId && (
            <button
              onClick={goToChat}
              className="w-full sm:w-auto px-4 py-2 bg-transparent rounded-lg transition"
            >
              <div className="flex justify-center items-center gap-2 outline outline-indigo-400 rounded-lg px-5 py-1 hover:outline-indigo-500">
                <span>Start Chat</span>
                <ChatIcon/>
              </div>
            </button>
          )}
        </div>
  
        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <nav className="flex min-w-max space-x-4 sm:space-x-8 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 text-sm sm:text-base whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-indigo-500 text-white"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
  
        {/* Form Content */}
        {activeTab === "config" && (
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2 text-sm sm:text-base">
                <AlertCircleIcon />
                <p className="text-red-500">{error}</p>
              </div>
            )}
  
            {success && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                <div className="flex items-center">
                  <p className="text-white flex-1 text-sm sm:text-base">
                    Agent {initialData ? "updated" : "created"} successfully!
                  </p>
                  <button onClick={() => setSuccess(false)}>
                    <CloseIcon />
                  </button>
                </div>
              </div>
            )}
      
  
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Agent Model
                </label>
            <div>
                <ImageSelect
                  options={options}
                  value={selectedModelValue}
                  onChange={setSelectedModelValue}
                />
              </div>      
              </div> */}

              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Agent Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder='e.g., "Crypto Analyst"'
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-3 sm:px-4 py-2 rounded-lg bg-zinc-700 outline-zinc-700 text-zinc-300 placeholder-zinc-400 text-sm sm:text-base"
                />
              </div>
  
              {textAreaFields.map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="block text-sm font-medium mb-2">
                    {field.label}
                  </label>
                  <textarea
                    required={field.required || false}
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={handleChange}
                    rows={field.rows || 10}
                    className="w-full px-3 sm:px-4 py-2 rounded-lg bg-zinc-700 outline-zinc-700 text-zinc-300 placeholder-zinc-400 text-sm sm:text-base"
                  />
                </div>
              ))}
  
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-10 px-6 py-2 bg-indigo-500 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading
                    ? initialData
                      ? "Updating..."
                      : "Creating..."
                    : initialData
                    ? "Update Agent"
                    : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        )}
  
        {/* Other tabs */}
        {activeTab === "knowledge" && (
          <KnowledgeTab
            agentId={initialData?.id || (Array.isArray(params?.agentId) ? params.agentId[0] : params?.agentId) || ""}
          />
        )}
        {activeTab === "wallet" && (
          <WalletTab
            agentId={initialData?.id || (Array.isArray(params?.agentId) ? params.agentId[0] : params?.agentId) || ""}
          />
        )}
        {activeTab === "apps" && (
          <AppMarketplaceTab
            agentId={initialData?.id || (Array.isArray(params?.agentId) ? params.agentId[0] : params?.agentId) || ""}
          />
        )}
      </div>
    </div>
  );
}
