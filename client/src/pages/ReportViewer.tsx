import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Share2, Eye, Calendar, User, CheckCircle } from "lucide-react";

export default function ReportViewer() {
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareEmails, setShareEmails] = useState("");

  const reports = [
    {
      id: 1,
      code: "AC#100001",
      organization: "Acme Corporation",
      generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      generatedBy: "João Silva",
      status: "publicado",
      maturity: 70,
      conformity: 75,
    },
    {
      id: 2,
      code: "AC#100002",
      organization: "Tech Solutions",
      generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      generatedBy: "Maria Santos",
      status: "rascunho",
      maturity: 65,
      conformity: 70,
    },
    {
      id: 3,
      code: "AC#100003",
      organization: "Global Industries",
      generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      generatedBy: "Pedro Costa",
      status: "publicado",
      maturity: 80,
      conformity: 85,
    },
  ];

  const getStatusColor = (status: string) => {
    return status === "publicado" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Visualizador de Relatórios</h1>
            <p className="text-indigo-100 mt-2">Acesse, compartilhe e exporte relatórios de avaliação</p>
          </div>
          <Badge className="bg-white text-indigo-600 text-lg px-4 py-2">
            {reports.length} Relatórios
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Meus Relatórios</TabsTrigger>
          <TabsTrigger value="preview">Visualização</TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <p className="font-semibold text-lg">{report.code}</p>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Organização</p>
                          <p className="font-medium text-gray-900">{report.organization}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gerado por</p>
                          <p className="font-medium text-gray-900">{report.generatedBy}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Data</p>
                          <p className="font-medium text-gray-900">
                            {report.generatedAt.toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Maturidade</p>
                          <p className="font-medium text-gray-900">{report.maturity}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Dialog open={isSharing && selectedReport === report.id} onOpenChange={setIsSharing}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-1" />
                            Compartilhar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Compartilhar Relatório</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Emails dos destinatários</Label>
                              <Input
                                placeholder="email1@exemplo.com, email2@exemplo.com"
                                value={shareEmails}
                                onChange={(e) => setShareEmails(e.target.value)}
                              />
                            </div>
                            <Button className="w-full">Compartilhar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <CardTitle>Visualização do Relatório</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-6 min-h-96 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Relatório AC#{100000 + selectedReport} será visualizado aqui
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      O HTML do relatório será renderizado nesta área
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-green-600">75%</p>
                      <p className="text-sm text-gray-600">Conformidade LGPD</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-blue-600">70%</p>
                      <p className="text-sm text-gray-600">Maturidade Geral</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-orange-600">3</p>
                      <p className="text-sm text-gray-600">Riscos Críticos</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Publicar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Selecione um relatório para visualizar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
