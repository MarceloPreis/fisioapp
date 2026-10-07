# Seletor de paciente

`web/src/components/PatientSelect.vue` padroniza a seleção em formulários de sessões/modelos, no plano semanal e no filtro de sessões.

```vue
<PatientSelect v-model="patientId" required />
<PatientSelect v-model="patientFilter" label="Filtrar por paciente" placeholder="Todos os pacientes" />
```

O `v-model` contém o UUID selecionado. Digitar um nome não seleciona automaticamente um paciente: é necessário escolher um resultado. O componente consulta `GET /api/v1/patients/search?name=...` após 300 ms de pausa e cancela buscas anteriores. A API retorna somente `id` e `fullName`, ordenados por nome e limitados a 20 resultados; refinar o texto permite localizar os demais pacientes. A pesquisa usa trechos literais do nome, sem diferenciar maiúsculas/minúsculas, e exige perfil `PHYSIO`.

O componente oferece limpeza da seleção, busca inicial ao abrir, estados de carregamento/erro/nenhum resultado e navegação por setas, Enter e Escape. `required` exige escolher um resultado; `disabled` impede interação. Um UUID fornecido externamente carrega seu nome pela API. Não é necessário pré-carregar a lista de pacientes nas telas consumidoras.
