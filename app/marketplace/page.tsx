// app/marketplace/page.tsx
"use client";

import { useState } from "react";

type Category = "Wallet" | "Portfolio" | "Analytics" | "Search" | "Market";
import { IconWrapper } from "@/components/app-icons";

interface MarketplaceStat {
  label: string;
  value: string;
  description: string;
}

export default function MarketplacePage() {
  const stats: MarketplaceStat[] = [
    {
      label: "Total Apps",
      value: "12",
      description: "Available in marketplace"
    },
    {
      label: "Categories",
      value: "5",
      description: "Different app categories"
    },
    {
      label: "Coming Soon",
      value: "Q2 2024",
      description: "Expected release date"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto py-24 px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              App Marketplace
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 mb-7">
              Enhance your AI agents with powerful tools and integrations.
            </p>
            <div className="inline-flex items-center px-5 py-0.5 rounded-full text-sm font-medium outline outline-indigo-500 text-white">
              Coming Soon
            </div>
          </div>

          {/* Statistics */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border border-zinc-800 rounded-lg px-6 py-8 bg-zinc-900/50 backdrop-blur-sm"
              >
                <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
                <p className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </span>
                </p>
                <p className="mt-2 text-sm text-zinc-400">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Preview */}
      <div className="max-w-7xl mx-auto py-24 px-6">
        <h2 className="text-2xl font-bold mb-8">App Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: "Wallet", description: "Track balances and manage assets" },
            { name: "Portfolio", description: "Monitor your portfolio performance" },
            { name: "Analytics", description: "Analyze market data and trends" },
            { name: "Search", description: "Find and explore tokens" },
            { name: "Market", description: "Track market movements" }
          ].map((category) => (
            <div
              key={category.name}
              className="p-6 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition"
            >
              <div className="flex items-center gap-4 mb-4">
                <IconWrapper category={category.name as Category} />
                <h3 className="text-lg font-medium">{category.name}</h3>
              </div>
              <p className="text-zinc-400">{category.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="relative">
        <div className="absolute inset-0 backdrop-blur-sm bg-zinc-900/50 z-10" />
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-20">
          <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-lg p-8 flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
            <p className="text-zinc-400 max-w-2xl">
              We're working hard to bring you a powerful marketplace of tools and integrations.
              The App Marketplace will not be available during the beta phase but stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}