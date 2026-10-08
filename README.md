# Automação de rebalanceamento de bicicletas compartilhadas

---

## Objetivo

Desenvolver um MVP low-code no n8n para apoiar a priorização do rebalanceamento das estações do Bike Itaú em Salvador. A proposta é consultar a disponibilidade atual, identificar estações com falta ou excesso de bicicletas e organizar sugestões de movimentação.

## Fonte dos dados

O projeto utiliza dois endpoints públicos no padrão GBFS:

- `station_information`: cadastro, localização e capacidade das estações;
- `station_status`: disponibilidade de bicicletas, vagas e situação operacional.

Fonte: [GBFS Bike Itaú Salvador](https://salvador.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json)

## Etapas planejadas

1. Definir as regras iniciais de criticidade e rebalanceamento.
2. Consultar e combinar os dados das estações.
3. Implementar a análise e a geração das ordens.
4. Montar o workflow no n8n.
5. Validar as regras e registrar os resultados.

## Estrutura planejada

```text
rebalanceamento_bikes_itau/
├── docs/
├── images/
├── scripts/
├── src/
├── tests/
├── workflows/
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

## Licença

O código e o workflow deste projeto são disponibilizados sob a [licença MIT](LICENSE).
