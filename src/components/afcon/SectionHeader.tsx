import React from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div>
                <h2 className="text-4xl font-display font-bold text-afcon-black dark:text-white uppercase tracking-tight">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="mt-4 md:mt-0">
                    {action}
                </div>
            )}
        </div>
    );
}
