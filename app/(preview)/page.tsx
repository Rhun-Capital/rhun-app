'use client';

import { BotIcon, BookIcon, SettingsIcon, ChevronRightIcon, MarketplaceIcon } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from "sonner";
import { Toaster } from 'sonner';
import {useRouter} from 'next/navigation';

export default function HomePage() {
  const { user, ready } = usePrivy();
  const router = useRouter();

  const features = [
    {
      title: 'Agents',
      description: 'Create and customize AI agents with specific knowledge and behaviors. Train them with documents and define how they interact.',
      icon: BotIcon,
      link: '/agents',
      linkText: 'Create an Agent',
      color: 'text-indigo-500',
    },
    {
      title: 'Apps',
      description: 'Access the marketplace to install and manage community tools that extend agent capabilities.',
      icon: MarketplaceIcon,
      link: '/marketplace',
      linkText: 'View Marketplace',
      color: 'text-indigo-500',
    },
    {
      title: 'Settings',
      description: 'Configure your account settings and manage your preferences.',
      icon: SettingsIcon,
      link: '/settings',
      linkText: 'View Settings',
      color: 'text-purple-500',
    },
  ];

  const steps = [
    'Create an agent and define its capabilities',
    'Upload documents to give your agent knowledge',
    'Chat with your agent and get AI-powered responses',
    'Refine agent settings based on interactions'
  ];

  const handleFeatureClick = (e: React.MouseEvent, feature: { title: string; description: string; icon: React.ElementType; link: string; linkText: string; color: string }) => {
    if (!user && ready) {
      e.preventDefault();
      toast.error('Please sign in to access this feature.');
      return
    }
    router.push(feature.link);
    router.refresh();
  };


  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-16">
          <div className="flex items-center gap-2 justify-center"><h1 className="text-4xl font-bold">Welcome to</h1><Image src="/images/rhun-logo-gradient.svg" alt="Rhun Capital" height={155} width={155} className="mt-1 ml-2"/></div>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Build and deploy AI agents that track, analyze, and surface market opportunities for you.
          </p>
          <div className="flex justify-center pt-5">
            <Link 
              href="https://rhun-capital.gitbook.io/rhun"
              target='_blank'
              className="inline-flex items-center gap-2 px-6 py-1 outline outline-indigo-500 hover:bg-indigo-500 rounded-full font-semibold transition-colors text-sm"
            >
              <span>Read The Docs</span>
              <BookIcon />
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title} 
              className="group"
              onClick={(e) => handleFeatureClick(e, feature)}
            >
              <div className="p-6 bg-zinc-800 rounded-lg border border-zinc-700 h-full cursor-pointer
                           transition-all duration-200 ease-in-out
                           hover:border-zinc-600 hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4"><feature.icon /></div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h2>
                <p className="text-zinc-400 mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-sm text-zinc-500 group-hover:text-indigo-400 transition-colors">
                  <span>{feature.linkText}</span>
                  <div className="h-4 w-4 ml-1 mb-1 group-hover:translate-x-1 transition-transform">&#8250;</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Getting Started Section */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8">
          <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 pt-5">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500
                                flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-zinc-300 pt-1">{step}</p>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
              <ul className="space-y-3 text-zinc-400">
                <li>• Provide detailed instructions when creating agents</li>
                <li>• Upload documents to improve agent knowledge</li>
                <li>• Ask the agent what tools it has access to</li>
                <li>• Review and adjust agent settings as needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Start Button */}
        {user && ready && <div className="text-center">
          <Link 
            href="/agents"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold transition-colors text-lg"
            onClick={(e) => {
              if (!user && ready) {
                e.preventDefault();
                toast.error('Please sign in to access this feature.');
              }
            }}            
          >
            Get Started
            &#8250;
          </Link>
        </div> }
      </div>
      <Toaster />
    </div>
  );
}