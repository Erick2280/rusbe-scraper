# ![Rusbé Scraper](/assets/logo.svg)
Ferramenta de raspagem de dados do Restaurante Universitário da UFPE.

![Build status](https://github.com/Erick2280/rusbe-scraper/workflows/build/badge.svg)

## Como funciona

// TODO: Incluir como funciona

## Executando localmente

Este projeto precisa da última versão do Deno instalada em sua máquina.

Para executar o script, execute no terminal o seguinte:

``` sh

    deno task start

```

O script se conectará à página do Restaurante Universitário, e caso haja dados novos, atualizará os arquivos JSON na pasta `/dist/days`.

Caso deseje que o script reinicie automaticamente em caso de alteração no código-fonte, execute no terminal o seguinte:

``` sh

    deno task dev

```