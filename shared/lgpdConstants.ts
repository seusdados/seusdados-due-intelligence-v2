/**
 * Constantes LGPD para seleção em formulários
 * Dados pessoais comuns, dados sensíveis e bases legais
 */

// Dados pessoais comuns (não sensíveis)
export const DADOS_PESSOAIS_COMUNS = [
  // Identificação
  { id: "nome", label: "Nome Completo", categoria: "Identificação" },
  { id: "cpf", label: "CPF", categoria: "Identificação" },
  { id: "rg", label: "RG", categoria: "Identificação" },
  { id: "cnh", label: "CNH", categoria: "Identificação" },
  { id: "passaporte", label: "Passaporte", categoria: "Identificação" },
  { id: "titulo_eleitor", label: "Título de Eleitor", categoria: "Identificação" },
  { id: "ctps", label: "CTPS", categoria: "Identificação" },
  { id: "pis_pasep", label: "PIS/PASEP", categoria: "Identificação" },
  { id: "foto", label: "Fotografia", categoria: "Identificação" },
  { id: "assinatura", label: "Assinatura", categoria: "Identificação" },
  
  // Contato
  { id: "email", label: "E-mail", categoria: "Contato" },
  { id: "telefone", label: "Telefone", categoria: "Contato" },
  { id: "celular", label: "Celular", categoria: "Contato" },
  { id: "endereco", label: "Endereço Completo", categoria: "Contato" },
  { id: "cep", label: "CEP", categoria: "Contato" },
  { id: "cidade", label: "Cidade", categoria: "Contato" },
  { id: "estado", label: "Estado/UF", categoria: "Contato" },
  
  // Dados Profissionais
  { id: "cargo", label: "Cargo/Função", categoria: "Profissional" },
  { id: "empresa", label: "Empresa", categoria: "Profissional" },
  { id: "matricula", label: "Matrícula", categoria: "Profissional" },
  { id: "salario", label: "Salário/Remuneração", categoria: "Profissional" },
  { id: "data_admissao", label: "Data de Admissão", categoria: "Profissional" },
  { id: "formacao", label: "Formação Acadêmica", categoria: "Profissional" },
  { id: "curriculo", label: "Currículo", categoria: "Profissional" },
  
  // Dados Financeiros
  { id: "conta_bancaria", label: "Conta Bancária", categoria: "Financeiro" },
  { id: "agencia", label: "Agência Bancária", categoria: "Financeiro" },
  { id: "pix", label: "Chave PIX", categoria: "Financeiro" },
  { id: "cartao_credito", label: "Dados de Cartão de Crédito", categoria: "Financeiro" },
  { id: "renda", label: "Renda Mensal", categoria: "Financeiro" },
  
  // Dados Demográficos
  { id: "data_nascimento", label: "Data de Nascimento", categoria: "Demográfico" },
  { id: "idade", label: "Idade", categoria: "Demográfico" },
  { id: "sexo", label: "Sexo", categoria: "Demográfico" },
  { id: "estado_civil", label: "Estado Civil", categoria: "Demográfico" },
  { id: "nacionalidade", label: "Nacionalidade", categoria: "Demográfico" },
  { id: "naturalidade", label: "Naturalidade", categoria: "Demográfico" },
  { id: "filiacao", label: "Filiação (Nome dos Pais)", categoria: "Demográfico" },
  
  // Dados Digitais
  { id: "ip", label: "Endereço IP", categoria: "Digital" },
  { id: "cookies", label: "Cookies", categoria: "Digital" },
  { id: "device_id", label: "ID do Dispositivo", categoria: "Digital" },
  { id: "localizacao", label: "Geolocalização", categoria: "Digital" },
  { id: "historico_navegacao", label: "Histórico de Navegação", categoria: "Digital" },
  { id: "login", label: "Login/Usuário", categoria: "Digital" },
  { id: "senha_hash", label: "Senha (hash)", categoria: "Digital" },
];

// Dados pessoais sensíveis (Art. 11 LGPD)
export const DADOS_SENSIVEIS = [
  // Origem Racial/Étnica
  { id: "origem_racial", label: "Origem Racial ou Étnica", categoria: "Origem" },
  { id: "cor_pele", label: "Cor da Pele", categoria: "Origem" },
  
  // Convicções
  { id: "opiniao_politica", label: "Opinião Política", categoria: "Convicções" },
  { id: "filiacao_partido", label: "Filiação a Partido Político", categoria: "Convicções" },
  { id: "religiao", label: "Convicção Religiosa", categoria: "Convicções" },
  { id: "filosofia", label: "Convicção Filosófica", categoria: "Convicções" },
  
  // Sindicato
  { id: "filiacao_sindicato", label: "Filiação a Sindicato", categoria: "Sindical" },
  { id: "filiacao_associacao", label: "Filiação a Associação de Caráter Religioso, Filosófico ou Político", categoria: "Sindical" },
  
  // Saúde
  { id: "dados_saude", label: "Dados de Saúde", categoria: "Saúde" },
  { id: "historico_medico", label: "Histórico Médico", categoria: "Saúde" },
  { id: "exames", label: "Exames Médicos", categoria: "Saúde" },
  { id: "atestados", label: "Atestados Médicos", categoria: "Saúde" },
  { id: "receitas", label: "Receitas Médicas", categoria: "Saúde" },
  { id: "plano_saude", label: "Dados do Plano de Saúde", categoria: "Saúde" },
  { id: "cid", label: "CID (Classificação de Doenças)", categoria: "Saúde" },
  { id: "deficiencia", label: "Informações sobre Deficiência", categoria: "Saúde" },
  
  // Vida Sexual
  { id: "vida_sexual", label: "Dados sobre Vida Sexual", categoria: "Sexual" },
  { id: "orientacao_sexual", label: "Orientação Sexual", categoria: "Sexual" },
  { id: "identidade_genero", label: "Identidade de Gênero", categoria: "Sexual" },
  
  // Genéticos e Biométricos
  { id: "dados_geneticos", label: "Dados Genéticos", categoria: "Biométrico" },
  { id: "dna", label: "DNA", categoria: "Biométrico" },
  { id: "biometria_digital", label: "Biometria Digital (Impressão Digital)", categoria: "Biométrico" },
  { id: "biometria_facial", label: "Biometria Facial", categoria: "Biométrico" },
  { id: "biometria_iris", label: "Biometria de Íris", categoria: "Biométrico" },
  { id: "biometria_voz", label: "Biometria de Voz", categoria: "Biométrico" },
];

// Bases legais Art. 7 (dados comuns)
export const BASES_LEGAIS_ART7 = [
  {
    id: "art7_i",
    inciso: "I",
    titulo: "Consentimento",
    descricao: "Mediante o fornecimento de consentimento pelo titular",
    requisitos: ["Consentimento livre, informado e inequívoco", "Finalidade específica", "Possibilidade de revogação"],
    exemplo: "Cadastro em newsletter, aceite de termos de uso"
  },
  {
    id: "art7_ii",
    inciso: "II",
    titulo: "Obrigação Legal ou Regulatória",
    descricao: "Para o cumprimento de obrigação legal ou regulatória pelo controlador",
    requisitos: ["Identificar a lei ou regulamento específico", "Tratamento limitado ao necessário"],
    exemplo: "Retenção de dados fiscais, cumprimento de normas trabalhistas"
  },
  {
    id: "art7_iii",
    inciso: "III",
    titulo: "Políticas Públicas",
    descricao: "Pela administração pública, para tratamento e uso compartilhado de dados necessários à execução de políticas públicas",
    requisitos: ["Previsão em lei ou regulamento", "Publicidade da política"],
    exemplo: "Programas sociais, políticas de saúde pública"
  },
  {
    id: "art7_iv",
    inciso: "IV",
    titulo: "Estudos por Órgão de Pesquisa",
    descricao: "Para a realização de estudos por órgão de pesquisa, garantida, sempre que possível, a anonimização dos dados pessoais",
    requisitos: ["Órgão de pesquisa reconhecido", "Anonimização quando possível"],
    exemplo: "Pesquisas acadêmicas, estudos estatísticos"
  },
  {
    id: "art7_v",
    inciso: "V",
    titulo: "Execução de Contrato",
    descricao: "Quando necessário para a execução de contrato ou de procedimentos preliminares relacionados a contrato do qual seja parte o titular",
    requisitos: ["Contrato existente ou em negociação", "Dados necessários para execução"],
    exemplo: "Processamento de pedidos, prestação de serviços contratados"
  },
  {
    id: "art7_vi",
    inciso: "VI",
    titulo: "Exercício Regular de Direitos",
    descricao: "Para o exercício regular de direitos em processo judicial, administrativo ou arbitral",
    requisitos: ["Processo existente ou iminente", "Dados relevantes para defesa"],
    exemplo: "Defesa em processos trabalhistas, ações judiciais"
  },
  {
    id: "art7_vii",
    inciso: "VII",
    titulo: "Proteção da Vida",
    descricao: "Para a proteção da vida ou da incolumidade física do titular ou de terceiro",
    requisitos: ["Situação de risco à vida", "Impossibilidade de obter consentimento"],
    exemplo: "Emergências médicas, situações de risco"
  },
  {
    id: "art7_viii",
    inciso: "VIII",
    titulo: "Tutela da Saúde",
    descricao: "Para a tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária",
    requisitos: ["Profissional ou serviço de saúde", "Finalidade de tutela da saúde"],
    exemplo: "Prontuários médicos, vigilância sanitária"
  },
  {
    id: "art7_ix",
    inciso: "IX",
    titulo: "Legítimo Interesse",
    descricao: "Quando necessário para atender aos interesses legítimos do controlador ou de terceiro, exceto no caso de prevalecerem direitos e liberdades fundamentais do titular",
    requisitos: ["Interesse legítimo identificado", "Teste de balanceamento (LIA)", "Transparência ao titular"],
    exemplo: "Prevenção a fraudes, marketing direto, segurança de rede"
  },
  {
    id: "art7_x",
    inciso: "X",
    titulo: "Proteção ao Crédito",
    descricao: "Para a proteção do crédito, inclusive quanto ao disposto na legislação pertinente",
    requisitos: ["Análise de crédito", "Conformidade com legislação de proteção ao crédito"],
    exemplo: "Consultas a bureaus de crédito, análise de risco de crédito"
  },
];

// Bases legais Art. 11 (dados sensíveis)
export const BASES_LEGAIS_ART11 = [
  {
    id: "art11_i",
    inciso: "I",
    titulo: "Consentimento Específico e Destacado",
    descricao: "Quando o titular ou seu responsável legal consentir, de forma específica e destacada, para finalidades específicas",
    requisitos: ["Consentimento específico", "Forma destacada", "Finalidades específicas"],
    exemplo: "Autorização para uso de dados de saúde em pesquisa"
  },
  {
    id: "art11_ii_a",
    inciso: "II, a",
    titulo: "Obrigação Legal ou Regulatória",
    descricao: "Cumprimento de obrigação legal ou regulatória pelo controlador",
    requisitos: ["Lei ou regulamento específico", "Tratamento necessário"],
    exemplo: "Exames admissionais obrigatórios, comunicação de doenças"
  },
  {
    id: "art11_ii_b",
    inciso: "II, b",
    titulo: "Políticas Públicas",
    descricao: "Tratamento compartilhado de dados necessários à execução, pela administração pública, de políticas públicas previstas em leis ou regulamentos",
    requisitos: ["Administração pública", "Política prevista em lei"],
    exemplo: "Programas de vacinação, políticas de inclusão"
  },
  {
    id: "art11_ii_c",
    inciso: "II, c",
    titulo: "Estudos por Órgão de Pesquisa",
    descricao: "Realização de estudos por órgão de pesquisa, garantida, sempre que possível, a anonimização dos dados pessoais sensíveis",
    requisitos: ["Órgão de pesquisa", "Anonimização quando possível"],
    exemplo: "Pesquisas epidemiológicas, estudos genéticos"
  },
  {
    id: "art11_ii_d",
    inciso: "II, d",
    titulo: "Exercício Regular de Direitos",
    descricao: "Exercício regular de direitos, inclusive em contrato e em processo judicial, administrativo e arbitral",
    requisitos: ["Direito a ser exercido", "Necessidade do dado sensível"],
    exemplo: "Defesa em ações trabalhistas com dados de saúde"
  },
  {
    id: "art11_ii_e",
    inciso: "II, e",
    titulo: "Proteção da Vida",
    descricao: "Proteção da vida ou da incolumidade física do titular ou de terceiro",
    requisitos: ["Risco à vida ou integridade física", "Urgência"],
    exemplo: "Atendimento de emergência, transfusão de sangue"
  },
  {
    id: "art11_ii_f",
    inciso: "II, f",
    titulo: "Tutela da Saúde",
    descricao: "Tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária",
    requisitos: ["Profissional ou serviço de saúde", "Procedimento de saúde"],
    exemplo: "Prontuário médico, exames laboratoriais"
  },
  {
    id: "art11_ii_g",
    inciso: "II, g",
    titulo: "Prevenção à Fraude e Segurança",
    descricao: "Garantia da prevenção à fraude e à segurança do titular, nos processos de identificação e autenticação de cadastro em sistemas eletrônicos",
    requisitos: ["Processo de identificação/autenticação", "Finalidade de segurança"],
    exemplo: "Biometria para acesso, reconhecimento facial em bancos"
  },
];

// Categorias de titulares
export const CATEGORIAS_TITULARES = [
  { id: "funcionario", label: "Funcionário/Colaborador" },
  { id: "ex_funcionario", label: "Ex-funcionário" },
  { id: "candidato", label: "Candidato a Emprego" },
  { id: "estagiario", label: "Estagiário" },
  { id: "menor_aprendiz", label: "Menor Aprendiz" },
  { id: "terceirizado", label: "Terceirizado" },
  { id: "cliente_pf", label: "Cliente Pessoa Física" },
  { id: "cliente_pj", label: "Cliente Pessoa Jurídica (Representante)" },
  { id: "fornecedor", label: "Fornecedor/Prestador de Serviço" },
  { id: "parceiro", label: "Parceiro Comercial" },
  { id: "visitante", label: "Visitante" },
  { id: "usuario_site", label: "Usuário do Site/App" },
  { id: "lead", label: "Lead/Prospect" },
  { id: "menor_idade", label: "Menor de Idade" },
  { id: "dependente", label: "Dependente de Funcionário" },
  { id: "acionista", label: "Acionista/Sócio" },
  { id: "conselheiro", label: "Conselheiro/Diretor" },
  { id: "outro", label: "Outro" },
];

// Departamentos comuns
export const DEPARTAMENTOS_COMUNS = [
  "Recursos Humanos",
  "Departamento Pessoal",
  "Financeiro",
  "Contabilidade",
  "Jurídico",
  "Comercial",
  "Marketing",
  "Atendimento ao Cliente",
  "Suporte Técnico",
  "TI/Tecnologia",
  "Operações",
  "Logística",
  "Compras",
  "Qualidade",
  "Segurança do Trabalho",
  "Medicina do Trabalho",
  "Comunicação",
  "Administrativo",
  "Diretoria",
  "Presidência",
];

// Finalidades comuns de tratamento
export const FINALIDADES_TRATAMENTO = [
  "Recrutamento e Seleção",
  "Gestão de Contratos de Trabalho",
  "Folha de Pagamento",
  "Benefícios",
  "Medicina e Segurança do Trabalho",
  "Treinamento e Desenvolvimento",
  "Avaliação de Desempenho",
  "Controle de Acesso",
  "Videomonitoramento",
  "Atendimento ao Cliente",
  "Vendas e Comercialização",
  "Marketing e Comunicação",
  "Análise de Crédito",
  "Cobrança",
  "Prevenção a Fraudes",
  "Cumprimento de Obrigações Legais",
  "Defesa em Processos",
  "Pesquisa e Estatística",
  "Melhoria de Produtos/Serviços",
  "Personalização de Experiência",
];
