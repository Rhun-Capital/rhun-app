'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { 
  BarChart2, 
  ArrowLeftRight, 
  Search, 
  TrendingUp, 
  Newspaper, 
  Globe, 
  LineChart, 
  BookOpenIcon,
  Sparkles,
  Clock,
  Zap,
  Activity,
  TrendingUp as TrendingUpIcon,
  ArrowUpRight,
  MessageSquare,
  Gauge,
  TrendingUp as TrendingUpIcon2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Floating particles component
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 2,
    duration: 4 + Math.random() * 4,
    xOffset: (Math.random() - 0.5) * 20,
    yOffset: (Math.random() - 0.5) * 20,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/10 opacity-0 scale-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-100 animate-glow"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            transitionDelay: `${particle.id * 50}ms`,
            animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s, glow 2s ease-in-out infinite ${particle.delay}s`,
            '--x-offset': `${particle.xOffset}px`,
            '--y-offset': `${particle.yOffset}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Holographic card component
const HolographicCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 ${className}`}
      onMouseMove={handleMouseMove}
    >
      {/* Holographic effect */}
      <div 
        className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
            rgba(59, 130, 246, 0.2) 0%, 
            rgba(99, 102, 241, 0.1) 20%, 
            rgba(168, 85, 247, 0.05) 40%, 
            transparent 60%)`,
        }}
      />
      
      {children}
    </div>
  );
};

// 3D Grid Pattern component
const Grid3D = () => {
  return (
    <div className="absolute inset-0">
      {/* Main 3D grid */}
      <div className="absolute inset-0 opacity-30 sm:group-hover:opacity-50 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          transform: 'perspective(1000px) rotateX(45deg)',
          transformOrigin: '50% 100%',
        }}
      />
      
      {/* Diagonal grid lines */}
      <div className="absolute inset-0 opacity-20 sm:group-hover:opacity-30 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          transform: 'perspective(1000px) rotateX(45deg)',
          transformOrigin: '50% 100%',
        }}
      />
      
      {/* Depth gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      
      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-0 sm:group-hover:opacity-20 transition-opacity duration-500"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: 'shimmer 3s infinite',
        }}
      />

      {/* Large dashed triangle outline */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: 'perspective(1000px) rotateX(45deg)',
          transformOrigin: '50% 100%',
        }}
      >
        <div
          className="relative"
          style={{
            width: '0',
            height: '0',
            borderLeft: '300px solid transparent',
            borderRight: '300px solid transparent',
            borderBottom: '500px solid transparent',
            borderStyle: 'dashed',
            borderWidth: '2px',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            animation: 'pulse 4s infinite',
          }}
        />
      </div>
    </div>
  );
};

// Enhanced Gradient Background component
const GradientBackground = ({ type }: { type: string }) => {
  const gradients = {
    'technical-analysis': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'swap': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'asset-search': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'stock-analysis': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'news-analysis': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'web-research': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'tradingview-chart': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'create-agent': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
    'buy-rhun': 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black'
  };

  return (
    <div className={`absolute inset-0 ${gradients[type as keyof typeof gradients]} opacity-95`}>
      {/* Base gradient */}
      <div className="absolute inset-0" />
      
      {/* Subtle radial gradient for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 via-transparent to-transparent" />
      
      {/* 3D Grid Pattern with reduced opacity */}
      <Grid3D />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(230,213,184,0.1), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  );
};

export default function HomePage() {
  const { user, ready } = usePrivy();
  const router = useRouter();

  const tools = [
    {
      title: 'Technical Analysis',
      description: 'Get detailed technical analysis for any asset with multiple indicators and market sentiment.',
      icon: BarChart2,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=technical-analysis',
      color: 'text-indigo-500',
      type: 'technical-analysis',
      isNew: true,
      stats: '20+ Indicators',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/technical-analysis-2+Background+Removed.png'
    },
    {
      title: 'Stock Analysis',
      description: 'Get comprehensive analysis of stocks including financial metrics and analyst consensus.',
      icon: TrendingUp,
      isNew: true,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=stock-analysis',
      color: 'text-indigo-500',
      type: 'stock-analysis',
      stats: 'Real-time Data',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/stocks-wire.png'
    },   
    {
      title: 'TradingView Chart',
      description: 'View interactive TradingView charts for any asset with multiple timeframes.',
      icon: LineChart,
      isNew: true,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=tradingview-chart',
      color: 'text-indigo-500',
      type: 'tradingview-chart',
      isPopular: true,
      stats: 'Live Charts',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/chart-wire.png'
    },     
    {
      title: 'Swap Tool',
      description: 'Execute token swaps with your agents directly from the chat interface with real-time quotes.',
      icon: ArrowLeftRight,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=swap',
      color: 'text-indigo-500',
      type: 'swap',
      isPopular: true,
      stats: '0.1% Slippage',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/swap-wire.png'
    },
    {
      title: 'Web Research',
      description: 'Perform web research and get summarized insights from multiple sources.',
      icon: Globe,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=web-research',
      color: 'text-indigo-500',
      type: 'web-research',
      stats: 'Multi-source',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/web-search.png'
    },    
    {
      title: 'Asset Search',
      description: 'Search and analyze any cryptocurrency or token with detailed market data.',
      icon: Search,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=search-tokens',
      color: 'text-indigo-500',
      type: 'asset-search',
      stats: '10K+ Assets',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/asset-search.png'
    },

    {
      title: 'News Analysis',
      description: 'Analyze market news and get sentiment analysis for better decision making.',
      icon: Newspaper,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=news-analysis',
      color: 'text-indigo-500',
      type: 'news-analysis',
      stats: 'AI-Powered',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/news-2.png'
    },
    {
      title: 'Fear & Greed Index',
      description: 'Track market sentiment with the Crypto Fear & Greed Index and historical data.',
      icon: Gauge,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=fear-greed',
      color: 'text-indigo-500',
      type: 'fear-greed',
      stats: 'Market Sentiment',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/fear-greed.png'
    },
    {
      title: 'Market Movers',
      description: 'Discover top gainers, losers, and trending assets across different timeframes.',
      icon: TrendingUpIcon2,
      link: '/agents/template/cc425065-b039-48b0-be14-f8afa0704357?tool=market-movers',
      color: 'text-indigo-500',
      type: 'market-movers',
      stats: 'Real-time Updates',
      image: 'https://d1olseq3j3ep4p.cloudfront.net/images/tools/market-movers.png'
    }
  ];

  const handleToolClick = (e: React.MouseEvent, tool: any) => {
    if (!user && ready) {
      e.preventDefault();
      toast.error('Please sign in to access this tool.');
      return;
    }
    router.push(tool.link);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8 sm:py-16">
          <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
            <h1 className="text-4xl font-bold">Welcome to</h1>
            <Image 
              src="https://d1olseq3j3ep4p.cloudfront.net/images/rhun-logo-white.svg" 
              alt="Rhun Capital" 
              height={155} 
              width={155} 
              className="mt-1 ml-2 antialiased"
            />
          </div>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Access powerful trading tools and analysis directly from your chat interface.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-5">
            <Link 
              href="https://rhun-capital.gitbook.io/rhun"
              target='_blank'
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-lg bg-zinc-700 text-white rounded-lg font-semibold transition-colors hover:bg-zinc-600 sm:px-6 sm:py-2 sm:text-base"
            >
              <span>Read Docs</span>
              <BookOpenIcon className="w-5 h-5"/>
            </Link>
            <Link 
              href="/agents/template/cc425065-b039-48b0-be14-f8afa0704357"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-lg bg-indigo-500 text-white rounded-lg font-semibold transition-colors hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] sm:px-6 sm:py-2 sm:text-base"
            >
              <span>Start Chatting</span>
              <MessageSquare className="w-5 h-5"/>
            </Link>
          </div>
        </div>

        {/* Featured Cards - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Agent Card */}
          <HolographicCard className="group hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300">
          <Link 
                    href="/agents/create"
                  >            
            <div className="group cursor-pointer h-full">
              <div className="relative h-[300px] sm:h-[400px] overflow-hidden rounded-lg transition-all duration-300 border border-indigo-500/20 group-hover:border-indigo-500/40">
                {/* Gradient background */}
                <GradientBackground type="create-agent" />
                
                {/* Card image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[300px] h-[300px] rounded-full overflow-hidden">
                    <Image
                      src="https://d1olseq3j3ep4p.cloudfront.net/images/tools/hero.png"
                      alt="Create Agent"
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105 opacity-60"
                      priority
                      quality={100}
                    />
                  </div>
                </div>
                
                {/* Animated gradient border */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Holographic overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                
                {/* Content gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/50 to-transparent" />
                
                {/* Indigo gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content Section */}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-3">Create Your Own Agent</h2>
                  <p className="text-zinc-400 text-base mb-6">Build and customize your own AI trading agent with specific strategies and tools.</p>
                  <Link 
                    href="/agents/create"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white rounded-lg font-semibold transition-all duration-200 border-2 border-indigo-500/50 hover:border-indigo-400 hover:text-white hover:bg-indigo-500/10  w-fit"
                  >
                    <span>Create Agent</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
            </Link>
          </HolographicCard>

          {/* Buy RHUN Card */}
          <HolographicCard className="group hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300">
            <Link href="https://jup.ag/swap/SOL-Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump" target="_blank">
              <div className="group cursor-pointer h-full">
                <div className="relative h-[300px] sm:h-[400px] overflow-hidden rounded-lg transition-all duration-300 border border-indigo-500/20 group-hover:border-indigo-500/40">
                  {/* Gradient background */}
                  <GradientBackground type="buy-rhun" />
                  
                  {/* Card image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
                      <Image
                        src="https://d1olseq3j3ep4p.cloudfront.net/images/tools/buy-rhun-wire.png"
                        alt="Buy RHUN"
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        priority
                        quality={100}
                      />
                    </div>
                  </div>
                  
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Holographic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                  
                  {/* Content gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/50 to-transparent" />
                  
                  {/* Indigo gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Content Section */}
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-3">Buy $RHUN Token</h2>
                    <p className="text-zinc-400 text-base mb-6">Get access to premium features and participate in the RHUN ecosystem.</p>
                    <div 
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white rounded-lg font-semibold transition-all duration-200 border-2 border-indigo-500/50 hover:border-indigo-400 hover:text-white hover:bg-indigo-500/10  w-fit"
                    >
                      <span>Buy on Jupiter</span>
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </HolographicCard>
        </div>

        {/* Tools Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Agent Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <HolographicCard key={tool.title}>
                <div 
                  className="group cursor-pointer h-full"
                  onClick={(e) => handleToolClick(e, tool)}
                >
                  <div className="relative h-48 overflow-hidden rounded-t-lg transition-all duration-300">
                    {/* Gradient background */}
                    <GradientBackground type={tool.type} />
                    
                    {/* Card image */}
                    {tool.image && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-48 h-48 rounded-2xl overflow-hidden">
                          <Image
                            src={tool.image}
                            alt={tool.title}
                            fill
                            className="object-cover animate-glow opacity-60 transition-transform duration-300 hover:scale-105"
                            priority
                            quality={100}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Floating particles */}
                    <FloatingParticles />
                    
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Holographic overlay - removing backdrop blur */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                    
                    {/* Content gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/50 to-transparent" />
                    
                    {/* Badges with animation - reducing blur */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {tool.isNew && (
                        <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>New</span>
                        </div>
                      )}
                      {/* {tool.isPopular && (
                        <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Popular</span>
                        </div>
                      )} */}
                    </div>

                    {/* Tool Info with floating effect */}
                    <div className="absolute bottom-4 left-4 right-4 transform group-hover:translate-y-[-5px] transition-transform duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <tool.icon className={`w-8 h-8 ${tool.color} drop-shadow-lg group-hover:scale-110 transition-transform duration-300`} />
                        <h2 className="text-xl font-semibold text-white drop-shadow-lg">{tool.title}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="px-2 py-1 bg-zinc-800/50 rounded-full backdrop-blur-sm flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>{tool.stats}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom card section with holographic effect */}
                  <div className="p-4 bg-zinc-800 rounded-b-lg border border-zinc-700/50 transition-all duration-200 ease-in-out group-hover:border-zinc-600 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-sm">
                    <p className="text-zinc-400 text-sm">{tool.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center text-sm text-zinc-500 group-hover:text-indigo-400 transition-colors">
                        <span>Try now</span>
                        <div className="h-4 w-4 ml-1 mb-1 group-hover:translate-x-1 transition-transform">&#8250;</div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>

        {/* View all tools button */}
        <div className="flex justify-center mt-12 pb-[200px]">
          <Link
            href="/agents/template/cc425065-b039-48b0-be14-f8afa0704357"
            className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all duration-200 border border-white/10 hover:border-white/20 backdrop-blur-sm"
          >
            <span>Start Chatting</span>
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0% { transform: translate(0, 0); }
          25% { transform: translate(var(--x-offset), var(--y-offset)); }
          50% { transform: translate(calc(var(--x-offset) * -1), calc(var(--y-offset) * -1)); }
          75% { transform: translate(calc(var(--x-offset) * 0.5), calc(var(--y-offset) * 0.5)); }
          100% { transform: translate(0, 0); }
        }
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.2),
                       0 0 10px rgba(255, 255, 255, 0.1);
          }
          50% { 
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.4),
                       0 0 20px rgba(255, 255, 255, 0.2);
          }
        }
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.5;
            transform: scale(1.05);
          }
        }
        .group:hover .grid-3d {
          transform: perspective(1000px) rotateX(45deg) translateZ(20px);
        }
      `}</style>
    </div>
  );
}