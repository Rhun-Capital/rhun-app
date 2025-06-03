"use client";

import { useState, useEffect, useRef } from "react";
import KnowledgeTab from "./knowledge-tab";
import WalletTab from "./wallet-tab";
import AppMarketplaceTab from "./app-marketplace-tab";
import TokenTab from "./token-tab";
import { CloseIcon, ChatIcon } from "./icons";
import { AlertCircle } from 'lucide-react';

import { usePrivy } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import ImageSelect from "./agent-model-select";
import ImageUpload from "./image-upload";
import Accordion from "./accordion";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import DeleteConfirmationModal from './delete-confirmation-modal';
import { InitialData, AgentFormProps, ImageState, TextAreaField } from '../types/agent';
import { AgentFormData, AgentFormDataKeys } from '../types/form';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
  title: string;
  message: string;
}

export default function AgentForm({ initialData = null }: AgentFormProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdFromTemplate, setCreatedFromTemplate] = useState(false);
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    preview: initialData?.imageUrl || null
  });  
  const [selectedModelValue, setSelectedModelValue] = useState('option1');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const topRef = useRef<HTMLDivElement>(null);
  const { user, getAccessToken } = usePrivy();
  const params = useParams();
  const router = useRouter();

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

  const textAreaFields: {
    name: AgentFormDataKeys;
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

  const defaultFormData: AgentFormData = {
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

  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);

  // Add cleanup effect for the preview URL
  useEffect(() => {
    // Cleanup the preview URL when component unmounts or when image changes
    return () => {
      if (imageState.preview && !imageState.preview.startsWith('http')) {
        URL.revokeObjectURL(imageState.preview);
      }
    };
  }, [imageState.preview]);  

  useEffect(() => {
    if (localStorage.getItem('agent_created')) {
      setCreated(true)
      setSuccess(true)
      localStorage.removeItem('agent_created')
    }
    if (localStorage.getItem('agent_created_from_template')) {
      setCreatedFromTemplate(true)
      setSuccess(true)
      localStorage.removeItem('agent_created_from_template')
    }    
  }, [])  

  // Initialize form with existing data if in edit mode
  useEffect(() => {
    if (initialData) {
      // Map AgentAttributes to AgentFormData
      setFormData({
        name: initialData.name,
        userId: initialData.userId || user?.id,
        description: initialData.description,
        coreCapabilities: initialData.coreCapabilities,
        interactionStyle: initialData.interactionStyle,
        analysisApproach: initialData.analysisApproach,
        riskCommunication: initialData.riskCommunication,
        responseFormat: initialData.responseFormat,
        limitationsDisclaimers: initialData.limitationsDisclaimers,
        prohibitedBehaviors: initialData.prohibitedBehaviors,
        knowledgeUpdates: initialData.knowledgeUpdates,
        styleGuide: initialData.styleGuide,
        specialInstructions: initialData.specialInstructions,
        responsePriorityOrder: initialData.responsePriorityOrder,
        image: initialData.imageUrl || null
      });
      
      // Set the image preview if there's an imageUrl
      if (initialData.imageUrl) {
        setImageState({
          file: null,
          preview: initialData.imageUrl
        });
      }
    }
  }, [initialData, user?.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (file: File | null) => {
    // Cleanup old preview if it exists and is not an HTTP URL
    if (imageState.preview && !imageState.preview.startsWith('http')) {
      URL.revokeObjectURL(imageState.preview);
    }

    if (file) {
      // Create a new preview URL for the uploaded file
      const previewUrl = URL.createObjectURL(file);
      setImageState({
        file,
        preview: previewUrl
      });
    } else {
      // Clear the image state when no file is provided
      setImageState({
        file: null,
        preview: null
      });
    }
  };


  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/agents/${decodeURIComponent(params.userId as string)}/${params.agentId}`, 
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
  
      toast.success('Agent deleted successfully');
      router.push(`/agents/`);
    } catch (error) {
      toast.error('Failed to delete agent');
      console.error('Error deleting agent:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };  

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess(false);

  try {
    const url = initialData
      ? `/api/agents/${decodeURIComponent(params.userId as string)}/${initialData.id}`
      : "/api/agents";

    const accessToken = await getAccessToken();
    
    // Prepare the agent data
    const agentData = {
      ...formData, // Use the current form state
      updatedAt: new Date().toISOString(),
      userId: user?.id,
      // Only include imageUrl if we're not uploading a new image
      imageUrl: imageState.file ? undefined : imageState.preview
    };

    // If this is a new agent, add creation timestamp
    if (!initialData) {
      agentData.createdAt = agentData.updatedAt;
    }
    
    // Create FormData for the request
    const requestFormData = new FormData();
    requestFormData.append('data', JSON.stringify(agentData));
    
    // Only append image if there's a new file
    if (imageState.file) {
      console.log('Appending new image to form data');
      requestFormData.append('image', imageState.file);
    }

    const response = await fetch(url, {
      method: initialData ? "PUT" : "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      body: requestFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to ${initialData ? "update" : "create"} agent`);
    }

    const responseData = await response.json();
    console.log('Server response:', responseData);

    // Safely extract the agent ID from the response
    const agentId = responseData.data?.id || responseData.agentId || responseData.id;

    // Update image state with the response data if available
    if (responseData.data?.imageUrl || responseData.imageUrl) {
      setImageState({
        file: null, // Clear the file since it's been uploaded
        preview: responseData.data?.imageUrl || responseData.imageUrl
      });
    }

    if (!initialData) {
      localStorage.setItem('agent_created', 'true');
      toast.success("Agent created successfully!");
      if (agentId) {
        router.push(`/agents/${user?.id}/${agentId}/edit`);
        router.refresh();
      } else {
        console.error('No agent ID found in response:', responseData);
        setError('Agent created but ID not found in response');
      }
    } else {
      setSuccess(true);
      setCreated(false);
      toast.success("Agent updated successfully!");
      scrollToTop();
    }
  } catch (err) {
    if (err instanceof Error) {
      toast.error(err.message);
      setError(err.message);
    } else {
      setError("An unknown error occurred");
    }
  } finally {
    setLoading(false);
  }
};

  const tabs = [
    { id: "config", label: "Configuration" },
    { id: "knowledge", label: "Knowledge Base" },
    { id: "wallet", label: "Wallet" },
    { id: "apps", label: "App Marketplace" },
    // { id: "token", label: "Create Token" },
  ];

  const goToChat = () => {
    router.push(`/agents/${decodeURIComponent(params.userId as string)}/${params.agentId}`);
    router.refresh();
  };

  const handleUseTemplate = async () => {
    
    setLoading(true);
    setError("");
    setSuccess(false);
  
    const now = new Date().toISOString();
    const templateData = {
      ...formData,
      id: uuidv4(),
      name: `${formData.name} Copy`,
      userId: user?.id,
      createdAt: now,
      updatedAt: now,
    };
  
    try {
      const accessToken = await getAccessToken();
      
      const formData = new FormData();
      formData.append('data', JSON.stringify(templateData));
      if (imageState.file) {
        formData.append('image', imageState.file);
      }
  
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("Failed to create agent from template");
      }

      const responseData = await response.json();
  
      localStorage.setItem('agent_created_from_template', 'true')
      toast.success("Agent created from template successfully!");
      router.push(`/agents/${user?.id}/${responseData.agentId}/edit`);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };  
  
  return (
    <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-4 sm:p-6 overflow-x-hidden w-full" ref={topRef}>
      <div className="max-w-4xl mx-auto w-full pb-16 sm:pb-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {initialData ? formData.name || "Edit Agent" : "Create Agent"}
          </h1>
          
          <div className="flex items-center w-full sm:w-auto flex-col sm:flex-row">
            {params.userId === "template" && (
              <button
                onClick={handleUseTemplate}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-transparent rounded-lg transition"
              >
                <div className="flex justify-center items-center gap-2 outline outline-green-400 rounded-lg px-5 py-1 hover:outline-green-500">
                  <span>{loading ? "Creating..." : "Use Template"}</span>
                </div>
              </button>
            )}

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
        </div>
                 
  
        {/* Tabs */}
        <div className="mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="overflow-x-auto pb-1">
            <nav className="flex flex-wrap gap-4 sm:gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-1 text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-indigo-500 text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
  
        {/* Form Content */}
        {activeTab === "config" && (
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2 text-sm sm:text-base">
                <AlertCircle />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
  
            {success && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                <div className="flex items-center">
                  <p className="text-sm text-white flex-1 text-sm sm:text-base">
                    Agent {initialData && !created && !createdFromTemplate ? "updated" : "created"} {createdFromTemplate ? 'from template' : ''} successfully!
                  </p>
                  <button onClick={() => setSuccess(false)}>
                    <CloseIcon />
                  </button>
                </div>
              </div>
            )}
      
  
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
  <div className="mb-6">
  <ImageUpload
      onImageChange={handleImageChange}
      initialImage={initialData?.imageUrl || imageState.preview || undefined}
    />
  </div>

  <div>
    <label htmlFor="name" className="block text-sm font-medium mb-2">
      Agent Name
    </label>
    <input
      id="name"
      name="name"
      type="text"
      placeholder="Crypto Analyst"
      required
      disabled={params.userId === 'template'}
      value={formData.name}
      onChange={handleChange}
      className="w-full px-3 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-zinc-300 placeholder-zinc-400 text-sm overflow-hidden text-ellipsis"
    />
  </div>

  <div>
    <label htmlFor="description" className="block text-sm font-medium mb-2">
      Description
    </label>
    <textarea
      id="description"
      name="description"
      placeholder="A crypto analyst providing insights on market trends"
      required
      disabled={params.userId === 'template'}
      value={formData.description}
      onChange={handleChange}
      rows={4}
      className="w-full px-3 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-zinc-300 placeholder-zinc-400 text-sm overflow-x-hidden break-words"
    />
  </div>

  <Accordion title="Advanced Options">
    <div className="space-y-4 sm:space-y-6 pt-4">
      {textAreaFields
        .filter(field => field.name !== "description")
        .map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium mb-2">
              {field.label}
            </label>
            <textarea
              required={field.required || false}
              id={field.name}
              name={field.name}
              disabled={params.userId === 'template'}
              placeholder={field.placeholder}
              value={String(formData[field.name] || '')}
              onChange={handleChange}
              rows={field.rows || 8}
              className="w-full px-3 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-zinc-300 placeholder-zinc-400 text-sm whitespace-pre-wrap font-mono"
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
        ))}
          </div>
        </Accordion>

        {params.userId !== 'template' && <div className="flex flex-col sm:flex-row sm:justify-end pt-4 gap-3 mb-12">
          {initialData && <button
            onClick={(e) => {
              e.preventDefault();
              setIsDeleteModalOpen(true)
            }}
            className="w-full sm:w-auto h-10 px-4 py-2 outline outline-red-500 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Delete Agent
          </button>}
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto h-10 px-4 py-2 outline outline-indigo-500 bg-indigo-500 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading
              ? initialData
                ? "Updating..."
                : "Creating..."
              : initialData
              ? "Update Agent"
              : "Create Agent"}
          </button>
        </div>}

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
        {activeTab === "token" && (
          <TokenTab
            agentId={initialData?.id || (Array.isArray(params?.agentId) ? params.agentId[0] : params?.agentId) || ""}
          />
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This action cannot be undone."
      />      

    </div>
  );
}
