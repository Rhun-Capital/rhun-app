'use client';

import { BotIcon, MessageIcon, SettingsIcon, ChevronRightIcon } from '@/components/icons';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function HomePage() {
  const { user } = usePrivy();

  const features = [
    {
      title: 'Agents',
      description: 'Create and customize AI agents with specific knowledge and behaviors. Train them with documents and define how they interact.',
      icon: BotIcon,
      link: '/agents',
      color: 'text-green-500',
    },
    {
      title: 'Chat',
      description: 'Interact with your agents through a chat interface. Upload files, ask questions, and get AI-powered responses.',
      icon: MessageIcon,
      link: '/chat',
      color: 'text-blue-500',
    },
    {
      title: 'Settings',
      description: 'Configure your account settings and manage your preferences.',
      icon: SettingsIcon,
      link: '/settings',
      color: 'text-purple-500',
    },
  ];

  const steps = [
    'Create an agent and define its capabilities',
    'Upload documents to give your agent knowledge',
    'Chat with your agent and get AI-powered responses',
    'Refine agent settings based on interactions'
  ];

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-4xl font-bold">Welcome to RHUN</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Create, customize, and interact with AI agents tailored to your needs.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link 
              key={feature.title} 
              href={feature.link}
              className="group"
            >
              <div className="p-6 bg-zinc-800 rounded-lg border border-zinc-700 h-full
                           transition-all duration-200 ease-in-out
                           hover:border-zinc-600 hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4"><feature.icon /></div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-green-400 transition-colors">
                  {feature.title}
                </h2>
                <p className="text-zinc-400 mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-sm text-zinc-500 group-hover:text-green-400 transition-colors">
                  <span>Learn more</span>
                  <div className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform"><ChevronRightIcon /></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Getting Started Section */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8">
          <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 text-green-500
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
                <li>• Use clear, specific questions when chatting</li>
                <li>• Review and adjust agent settings as needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <Link 
            href="/agents"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 
                     rounded-lg font-semibold transition-colors text-lg"
          >
            Get Started
            <ChevronRightIcon/>
          </Link>
        </div>
      </div>
    </div>
  );
}