// Página Unificada de Templates - LGPD e MeuDPO

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, FileEdit, Scale } from "lucide-react";
import LgpdTemplateEditor from "./LgpdTemplateEditor";
import MeudpoTemplates from "./MeudpoTemplates";

export default function TemplatesUnificados() {
  const [activeTab, setActiveTab] = useState("lgpd");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-violet-600 mb-2">GESTÃO DE DOCUMENTOS</p>
        <h1 className="text-3xl font-extralight tracking-tight text-foreground">
          Central de <span className="text-gradient-seusdados font-light">Templates</span>
        </h1>
        <p className="text-muted-foreground font-light mt-1">
          Gerencie templates de documentos LGPD e respostas do MeuDPO
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-violet-50/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground">TEMPLATES LGPD</p>
                <p className="body-small mt-1">Contratos, políticas e documentos de conformidade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-pink-50/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground">TEMPLATES MEUDPO</p>
                <p className="body-small mt-1">Respostas rápidas para atendimento de tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
          <TabsTrigger 
            value="lgpd" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            <Scale className="h-4 w-4 mr-2" />
            Templates LGPD
          </TabsTrigger>
          <TabsTrigger 
            value="meudpo"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates MeuDPO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lgpd" className="mt-6">
          <LgpdTemplateEditorContent />
        </TabsContent>

        <TabsContent value="meudpo" className="mt-6">
          <MeudpoTemplatesContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente interno para Templates LGPD (sem o DashboardLayout wrapper)
function LgpdTemplateEditorContent() {
  // Importar o conteúdo do LgpdTemplateEditor sem o wrapper
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-violet-600" />
            Templates de Documentos LGPD
          </CardTitle>
          <CardDescription>
            Edite e personalize templates de contratos, políticas de privacidade, termos de consentimento e outros documentos de conformidade LGPD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileEdit className="h-12 w-12 mx-auto mb-4 text-violet-300" />
            <p className="font-medium">Acesse Templates LGPD</p>
            <p className="text-sm mt-1">Selecione uma organização para visualizar e editar os templates disponíveis.</p>
            <a 
              href="/lgpd-templates" 
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <FileEdit className="h-4 w-4" />
              Abrir Editor de Templates LGPD
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente interno para Templates MeuDPO (sem o DashboardLayout wrapper)
function MeudpoTemplatesContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-pink-600" />
            Templates de Resposta Rápida
          </CardTitle>
          <CardDescription>
            Crie e gerencie templates de respostas para agilizar o atendimento de tickets no MeuDPO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-pink-300" />
            <p className="font-medium">Acesse Templates MeuDPO</p>
            <p className="text-sm mt-1">Gerencie templates de respostas rápidas para diferentes tipos de tickets.</p>
            <a 
              href="/meudpo-templates" 
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <MessageSquare className="h-4 w-4" />
              Abrir Templates MeuDPO
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
