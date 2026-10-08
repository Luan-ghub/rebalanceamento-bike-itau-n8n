# Regras de negócio

## Como a criticidade é calculada

A ocupação da estação é calculada da seguinte forma:

```text
bicicletas disponíveis ÷ capacidade da estação
```

Uma estação com 2 bicicletas e capacidade para 20 possui 10% de ocupação.

## Classificação inicial

| Classificação | Regra |
|---|---|
| Crítica | Ocupação menor ou igual a 15% |
| Atenção | Ocupação acima de 15% e abaixo de 30% |
| Equilibrada | Ocupação entre 30% e 80% |
| Excesso | Ocupação acima de 80% e até 90% |
| Risco de lotação | Ocupação acima de 90% |
| Indisponível | Estação fechada, sem aluguel, sem devolução ou sem capacidade informada |

## Quando uma ordem é criada

**Estação Destino:**
Uma estação pode ser destino quando está na classificação crítica.


**Estação Origem**
- Está operacional
- Possui mais de 80% de ocupação
- Consegue manter pelo menos 40% da capacidade após a retirada
- Está a no máximo 8 km do destino

## Quantidade sugerida

A quantidade considera três limites e a movimentação só é criada quando possui pelo menos 2 bicicletas.

1. O necessário para levar o destino até 50% da capacidade.
2. O saldo que a origem pode fornecer sem ficar abaixo de 40%.
3. O máximo de 8 bicicletas por ordem.

## Prioridade

| Prioridade | Regra |
|---|---|
| Crítica | Estação de destino sem nenhuma bicicleta |
| Alta | Estação com até 10% de ocupação |
| Média | Estação acima de 10% e até 15% |

## Controle de duplicidade

A chave da ordem combina:

- Data local
- Identificador da origem
- Identificador do destino

Assim, a mesma recomendação não é aberta repetidamente durante o mesmo dia
