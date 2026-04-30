"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileTextIcon, TrendingUpIcon, DownloadIcon, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReportsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">System Reports</h2>
                    <p className="text-muted-foreground mt-1">Generate and view vaccination and inventory analytics.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Pick Date
                    </Button>
                    <Button className="bg-[#2FA4D7] text-white rounded-xl">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-2xl border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle>Vaccination Trends</CardTitle>
                        <CardDescription>Monthly vaccination coverage across all farms.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px] flex items-center justify-center bg-muted/5 rounded-xl m-4 border border-dashed border-muted/40">
                        <TrendingUpIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                        <span className="ml-2 text-sm text-muted-foreground">Chart loading...</span>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle>Recent Reports</CardTitle>
                        <CardDescription>Latest generated documents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <li key={i} className="flex items-center justify-between p-3 bg-muted/5 rounded-xl border border-muted/20">
                                    <div className="flex items-center gap-3">
                                        <FileTextIcon className="h-4 w-4 text-[#2FA4D7]" />
                                        <span className="text-sm font-medium">Monthly_Report_March_2026.pdf</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <DownloadIcon className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
