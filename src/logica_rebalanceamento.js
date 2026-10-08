/*
Este arquivo concentra as regras de negócio do projeto.

O n8n terá uma cópia desta lógica dentro do nó de análise. Manter a lógica
também neste arquivo permite testar as regras sem depender da interface do n8n.
*/

function obterTextoLocalizado(valor) {
  if (typeof valor === "string") {
    return valor;
  }

  if (Array.isArray(valor) && valor.length > 0) {
    const portugues = valor.find((item) => item.language === "pt" || item.language === "pt-BR");
    return (portugues || valor[0]).text || "Estação sem nome";
  }

  return "Estação sem nome";
}

function numeroSeguro(valor, valorPadrao = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valorPadrao;
}

function distanciaEmKm(latitude1, longitude1, latitude2, longitude2) {
  const raioTerra = 6371;
  const converterParaRadianos = (graus) => graus * Math.PI / 180;

  const diferencaLatitude = converterParaRadianos(latitude2 - latitude1);
  const diferencaLongitude = converterParaRadianos(longitude2 - longitude1);

  const parteA = Math.sin(diferencaLatitude / 2) ** 2
    + Math.cos(converterParaRadianos(latitude1))
    * Math.cos(converterParaRadianos(latitude2))
    * Math.sin(diferencaLongitude / 2) ** 2;

  return raioTerra * 2 * Math.atan2(Math.sqrt(parteA), Math.sqrt(1 - parteA));
}

function formatarDataLocal(data, fusoHorario) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(data);

  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function classificarOcupacao(ocupacao, parametros) {
  if (ocupacao <= parametros.limiteCritico) {
    return "Crítica";
  }

  if (ocupacao < parametros.limiteAtencao) {
    return "Atenção";
  }

  if (ocupacao > parametros.limiteLotacao) {
    return "Risco de lotação";
  }

  if (ocupacao > parametros.limiteDoadora) {
    return "Excesso";
  }

  return "Equilibrada";
}

function analisarRebalanceamento(cadastroResposta, statusResposta, configuracao = {}) {
  const parametros = {
    limiteCritico: configuracao.limiteCritico ?? 0.15,
    limiteAtencao: configuracao.limiteAtencao ?? 0.30,
    limiteDoadora: configuracao.limiteDoadora ?? 0.80,
    limiteLotacao: configuracao.limiteLotacao ?? 0.90,
    reservaDoadora: configuracao.reservaDoadora ?? 0.40,
    alvoDestino: configuracao.alvoDestino ?? 0.50,
    transferenciaMinima: configuracao.transferenciaMinima ?? 2,
    transferenciaMaxima: configuracao.transferenciaMaxima ?? 8,
    distanciaMaximaKm: configuracao.distanciaMaximaKm ?? 8,
    fusoHorario: configuracao.fusoHorario ?? "America/Bahia",
    agora: configuracao.agora ? new Date(configuracao.agora) : new Date()
  };

  const cadastros = cadastroResposta?.data?.stations || [];
  const status = statusResposta?.data?.stations || [];

  if (!Array.isArray(cadastros) || !Array.isArray(status)) {
    throw new Error("A API não devolveu as listas de estações no formato esperado.");
  }

  const cadastroPorId = new Map(cadastros.map((estacao) => [String(estacao.station_id), estacao]));

  const todasAsEstacoes = status.map((situacao) => {
    const stationId = String(situacao.station_id);
    const cadastro = cadastroPorId.get(stationId) || {};
    const capacidade = numeroSeguro(cadastro.capacity);
    const bicicletas = numeroSeguro(situacao.num_vehicles_available);
    const vagas = numeroSeguro(situacao.num_docks_available);

    const operacional = Boolean(situacao.is_installed)
      && Boolean(situacao.is_renting)
      && Boolean(situacao.is_returning)
      && capacidade > 0;

    const ocupacao = capacidade > 0 ? bicicletas / capacidade : 0;

    return {
      station_id: stationId,
      nome: obterTextoLocalizado(cadastro.name),
      latitude: numeroSeguro(cadastro.lat, null),
      longitude: numeroSeguro(cadastro.lon, null),
      capacidade,
      bicicletas,
      vagas,
      operacional,
      ocupacao,
      ocupacao_pct: Number((ocupacao * 100).toFixed(1)),
      classificacao: operacional ? classificarOcupacao(ocupacao, parametros) : "Indisponível"
    };
  });

  const estacoesOperacionais = todasAsEstacoes.filter((estacao) => estacao.operacional);
  const destinos = estacoesOperacionais
    .filter((estacao) => estacao.ocupacao <= parametros.limiteCritico)
    .sort((a, b) => a.ocupacao - b.ocupacao || a.bicicletas - b.bicicletas);

  const doadoras = estacoesOperacionais
    .filter((estacao) => estacao.ocupacao > parametros.limiteDoadora)
    .map((estacao) => {
      const quantidadeReservada = Math.ceil(estacao.capacidade * parametros.reservaDoadora);
      return {
        ...estacao,
        saldoDisponivel: Math.max(0, estacao.bicicletas - quantidadeReservada)
      };
    });

  const dataDaOrdem = formatarDataLocal(parametros.agora, parametros.fusoHorario);
  const momentoExecucao = parametros.agora.toISOString();
  const execucaoId = `bike_salvador_${momentoExecucao.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const ordens = [];

  for (const destino of destinos) {
    const quantidadeAlvo = Math.ceil(destino.capacidade * parametros.alvoDestino);
    const necessidade = Math.max(0, quantidadeAlvo - destino.bicicletas);

    const candidatas = doadoras
      .filter((doadora) => doadora.station_id !== destino.station_id)
      .filter((doadora) => doadora.saldoDisponivel >= parametros.transferenciaMinima)
      .filter((doadora) => doadora.latitude !== null && doadora.longitude !== null)
      .filter(() => destino.latitude !== null && destino.longitude !== null)
      .map((doadora) => ({
        doadora,
        distancia: distanciaEmKm(
          doadora.latitude,
          doadora.longitude,
          destino.latitude,
          destino.longitude
        )
      }))
      .filter((candidata) => candidata.distancia <= parametros.distanciaMaximaKm)
      .sort((a, b) => a.distancia - b.distancia);

    if (candidatas.length === 0 || necessidade < parametros.transferenciaMinima) {
      continue;
    }

    const escolhida = candidatas[0];
    const quantidade = Math.min(
      necessidade,
      escolhida.doadora.saldoDisponivel,
      parametros.transferenciaMaxima
    );

    if (quantidade < parametros.transferenciaMinima) {
      continue;
    }

    escolhida.doadora.saldoDisponivel -= quantidade;

    const prioridade = destino.bicicletas === 0
      ? "Crítica"
      : destino.ocupacao <= 0.10
        ? "Alta"
        : "Média";

    ordens.push({
      chave_ordem: `${dataDaOrdem}_${escolhida.doadora.station_id}_${destino.station_id}`,
      criada_em: momentoExecucao,
      origem_id: escolhida.doadora.station_id,
      origem: escolhida.doadora.nome,
      destino_id: destino.station_id,
      destino: destino.nome,
      quantidade,
      distancia_km: Number(escolhida.distancia.toFixed(2)),
      prioridade,
      motivo: destino.bicicletas === 0
        ? "Estação sem bicicletas disponíveis"
        : `Estação com apenas ${destino.ocupacao_pct}% de ocupação`,
      status: "Pendente",
      origem_ocupacao_pct: escolhida.doadora.ocupacao_pct,
      destino_ocupacao_pct: destino.ocupacao_pct,
      execucao_id: execucaoId
    });
  }

  const contar = (classificacao) => estacoesOperacionais
    .filter((estacao) => estacao.classificacao === classificacao).length;

  const totalBicicletasSugeridas = ordens.reduce((total, ordem) => total + ordem.quantidade, 0);

  const resumo = {
    execucao_id: execucaoId,
    executada_em: momentoExecucao,
    total_estacoes: todasAsEstacoes.length,
    estacoes_operacionais: estacoesOperacionais.length,
    criticas: contar("Crítica"),
    atencao: contar("Atenção"),
    equilibradas: contar("Equilibrada"),
    excesso: contar("Excesso"),
    risco_lotacao: contar("Risco de lotação"),
    ordens_sugeridas: ordens.length,
    bicicletas_sugeridas: totalBicicletasSugeridas
  };

  const mensagem = ordens.length > 0
    ? `${ordens.length} ordens sugeridas, movimentando ${totalBicicletasSugeridas} bicicletas.`
    : "Nenhuma ordem foi necessária com os parâmetros atuais.";

  return {
    resumo: { ...resumo, mensagem },
    ordens,
    estacoes: todasAsEstacoes,
    logExecucao: {
      ...resumo,
      fonte: "GBFS Bike Itaú Salvador",
      mensagem
    }
  };
}

module.exports = {
  analisarRebalanceamento,
  classificarOcupacao,
  distanciaEmKm,
  obterTextoLocalizado
};
