<div id="MyWidget_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide" data-params="MyWidget.instance()">
	
	<!-- js -->
	<script type="text/javascript" src="/webdesk/vcXMLRPC.js"></script> 
	
	<!-- lib -->
	<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
	<link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.css" rel="stylesheet">
	<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.mask/1.14.16/jquery.mask.min.js"></script>
	<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
	<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
	
	<!-- campos variaveis -->
	<input type="hidden" name="matriculaUsuario" id="matriculaUsuario" />
	<input type="hidden" name="emailUsuario" id="emailUsuario" />
	<input type="hidden" name="codRM" id="codRM" />
	
	<div class="ts-container">	
 		<!-- MENU LATERAL -->
	  	<aside class="ts-sidebar">
  			<button class="ts-sidebar-toggle" id="tsSidebarToggle">
		        <i class="flaticon flaticon-menu icon-lg"></i>
		    </button>
		  	<nav class="ts-nav">
		    	<ul class="ts-menu">		
		      		<li class="ts-menu-item active" data-view="painel" title="Meu painel">
			        	<i class="flaticon flaticon-home icon-md"></i>
			        	<span>Meu painel</span>
			      	</li>
		
			      	<li class="ts-menu-item" data-view="apontamento" title="Apontamento de horas">
			        	<i class="flaticon flaticon-timer icon-md"></i>
			        	<span>Apontamento de horas</span>
			      	</li>
		
		      		<li class="ts-menu-item" data-view="aprovacoes" title="Aprovação de horas">
		        		<i class="flaticon flaticon-document-approved icon-md"></i>
		        		<span>Aprovação de horas</span>
		      		</li>
		
		      		<li class="ts-menu-item" data-view="relatorios" title="Relatórios">
		        		<i class="flaticon flaticon-chart-bar icon-md"></i>
		        		<span>Relatórios</span>
		      		</li>
		      		
		      		<li class="ts-menu-item" data-view="aprovacao-massiva" title="Aprovação Massiva">
		        		<i class="flaticon flaticon-class-check icon-md"></i>
		        		<span>Aprovação Massiva</span>
		      		</li>
		    	</ul>
		  	</nav>
		</aside>
	
	  	<!-- CONTEÚDO -->
  		<main class="ts-main">
  		
    		<header class="ts-header">
			    <div class="ts-header-content">			
			        <span id="ts-logo">
			            <img src="/wdg_timesheet/resources/images/logo_teste.png" alt="Cliente">
			        </span>
			
			        <span class="ts-product-name">
			            Timesheet
			        </span>
			
			        <span class="ts-header-separator">-</span>
			
			        <span class="ts-user-greeting">
			            Olá, <b id="ts-usuario"></b>
			        </span>
			
			        <span class="ts-header-separator">-</span>
			
			        <span class="ts-date">
			            <span id="ts-dia-semana"></span>
			            <span id="ts-data"></span>
			        </span>			
			    </div>			
			</header>


    		<!-- --- MEU PAINEL --- -->
			<section class="ts-view ts-panel active" id="divMeuPainel" data-view="painel">	
				<h3>Painel pessoal</h3>
				<!-- <div class="vf-header-painel">
		      		<h3>Painel pessoal</h3>
		      		<div class="vf-atualiza-painel" style="margin-bottom:10px;">
					    <button id="btn-atualiza-painel" class="btn btn-default" title="Atualizar painel">
					        <i class="flaticon flaticon-refresh icon-sm"></i>
					    </button>
					</div>
				</div>-->

		      	<div class="ts-cards">
			  		<div class="ts-card ts-card-primary">
				    	<span class="ts-card-label">Expectativa no mês</span>
				    	<strong class="ts-card-value" id="ts-horas-mes">--</strong>
				  	</div>
				
				  	<div class="ts-card ts-card-success">
				    	<span class="ts-card-label">Horas aprovadas</span>
				    	<strong class="ts-card-value" id="ts-horas-aprovadas">--</strong>
				  	</div>
				
				  	<div class="ts-card ts-card-warning">
				    	<span class="ts-card-label">Horas pendentes</span>
				    	<strong class="ts-card-value" id="ts-horas-pendentes">--</strong>
				  	</div>
				
				  	<div class="ts-card ts-card-danger">
				    	<span class="ts-card-label">Faltam apontar</span>
				    	<strong class="ts-card-value" id="ts-horas-faltantes">--</strong>
				  	</div>
				  	
				  	<div class="ts-card">
				    	<span class="ts-card-label">Fim da competência</span>
				    	<strong class="ts-card-value" id="ts-fim-competencia">--</strong>
				  	</div>
				  	
				  	<div class="ts-card">
				    	<span class="ts-card-label">Calendário</span>
				    	<i class="flaticon flaticon-calendar icon-xl vf-open-calendar-visualizacao" style="cursor:pointer;" title="Visualizar calendário"></i>
				  	</div>		
				</div>

      			<div class="vf-export-wrapper" style="margin-bottom:10px;text-align:right">
				    <button id="btn-export-tarefas-excel" class="btn btn-info" title="Exportar para Excel" disabled>
				        <i class="flaticon flaticon-log-download icon-sm"></i> Exportar
				    </button>
				</div>
									
				<div class="ts-grid-body">				
			    	<table class="ts-grid-table" id="ts-tarefas">				
			      		<thead>
			        		<tr>
				          		<th style="width:120px">Projeto</th>
					          	<th style="width:200px">Nome Projeto</th>
					          	<th style="width:120px">Código Tarefa</th>
					          	<th style="width:130px">Tarefa</th>
					          	<th style="width:130px">Horas Previstas</th>
					          	<th style="width:140px">Horas Realizadas</th>
					          	<th style="width:130px">Situação</th>
					          	<th style="width:120px">Início Previsto</th>
					          	<th style="width:120px">Fim Previsto</th>
			        		</tr>
			      		</thead>
			
			      		<tbody id="ts-tarefas-body">
			        		<!-- JS vai preencher -->
			      		</tbody>				
		    		</table>				
		  		</div>	
    		</section>	
    		
    		<!-- --- APONTAMENTOS --- -->
    		<section class="ts-view ts-apontamentos" id="divApontamentos" data-view="apontamento"> 	 
		  		<h3>Apontamento de horas</h3>	
		  						
    			<div class="row vf-row-delegar">	
				    <div class="col-md-4">
				        <label>Lançar por</label>
				
				        <div class="input-group">
				            <select id="delegar-apontamento" class="form-control vf-delegar-apontamento" style="width:100%"></select>
				
				            <span class="input-group-addon vf-open-calendar-apont-visualizacao" style="cursor:pointer;padding:1px" title="Visualizar calendário">
				                <i class="flaticon flaticon-calendar icon-md"></i>
				            </span>
				        </div>
				
				        <input type="hidden" name="delegar-apontamento-matr" id="delegar-apontamento-matr" />
				        <input type="hidden" name="delegar-apontamento-codRM" id="delegar-apontamento-codRM" />
				        <input type="hidden" name="delegar-apontamento-nome" id="delegar-apontamento-nome" />
				    </div>
				</div>
    			
    			<div class="vf-apontamento-container">				    
				    <div class="vf-ap-actions">
				        <button class="btn btn-info" id="btnAddApontHoras">
				            +
				        </button>
				    </div><br>

				    <div class="ts-grid-body">				
				    	<table class="ts-grid-table" id="ts-apontamento-horas">				
				      		<thead>
				        		<tr>
				        			<th style="width:10px;text-align:center;">#</th>
					          		<th style="width:120px">Nome Projeto</th>
						          	<th style="width:100px">Tarefa</th>
						          	<th style="width:60px">Data</th>
						          	<th style="width:35px">Horas</th>
						          	<th style="width:100px">Observação</th>
						          	<th style="width:10px"></th>
				        		</tr>
				      		</thead>
				
				      		<tbody id="ts-apontamento-horas-body">
				        		<!-- JS vai preencher -->
				      		</tbody>				
			    		</table>				
			  		</div><br>
			  		
			  		<div class="vf-ap-actions">				        
				        <button class="btn btn-primary" id="btnEnviaHoras">
				            <i class="flaticon flaticon-present-to-all icon-sm"></i> Enviar
				        </button>
				    </div>	
				</div><hr>
				
		  		<h3>Consulta de horas</h3>	
		  		
    			<div class="vf-consulta-apont-container">	
    				<!-- Filtros -->
				    <div class="row">				
				        <div class="col-md-2">
				            <label>Mês</label>
				            <select id="filtro-mes" class="form-control">
				                <option value="01">Janeiro</option>
				                <option value="02">Fevereiro</option>
				                <option value="03">Março</option>
				                <option value="04">Abril</option>
				                <option value="05">Maio</option>
				                <option value="06">Junho</option>
				                <option value="07">Julho</option>
				                <option value="08">Agosto</option>
				                <option value="09">Setembro</option>
				                <option value="10">Outubro</option>
				                <option value="11">Novembro</option>
				                <option value="12">Dezembro</option>
				            </select>
				        </div>
				        				
				        <div class="col-md-2">
				            <label>Ano</label>
				            <input type="text" id="filtro-ano" class="form-control">
				        </div>
				
				        <div class="col-md-4">
				            <label>Projeto</label>
				            <select id="filtro-projeto" class="form-control vf-zoom-projeto" style="width:100%"></select>
				            <input type="hidden" name="filtro-id-projeto" id="filtro-id-projeto" />
				            <input type="hidden" name="filtro-cod-projeto" id="filtro-cod-projeto" />
				        </div>
				
				        <div class="col-md-4">
				            <label>Tarefa</label>
				            <select id="filtro-tarefa" class="form-control vf-zoom-tarefa" style="width:100%"></select>
				            <input type="hidden" name="filtro-cod-tarefa" id="filtro-cod-tarefa" />
				        </div>				
				    </div><br>
				    
				    <div class="row">
				    	<div class="form-group col-md-11">
						    <label>Status</label><br>						
						    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
						        <input type="checkbox" id="status-revisado" class="vf-filtro-status" value="Revisado">
						        <label for="status-revisado">Revisado</label>
						    </div>
						
						    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
						        <input type="checkbox" id="status-aprovado" class="vf-filtro-status" value="Aprovado">
						        <label for="status-aprovado">Aprovado</label>
						    </div>
						
						    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
						        <input type="checkbox" id="status-reprovado" class="vf-filtro-status" value="Reprovado">
						        <label for="status-reprovado">Reprovado</label>
						    </div>
						
						    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
						        <input type="checkbox" id="status-andamento" class="vf-filtro-status" value="Pendente aprovação">
						        <label for="status-andamento">Pendente aprovação</label>
						    </div>						
						</div>
						<div class="form-group col-md-2">
							<button class="btn btn-primary" id="btn-filtrar">
								<i class="flaticon flaticon-search icon-sm"></i> Filtrar
							</button>
						</div>
				    </div><hr>
				    
				    <div class="vf-export-wrapper" style="margin-bottom:10px;text-align:right">
					    <button id="btn-export-apontamentos-excel" class="btn btn-info" title="Exportar para Excel" disabled>
					        <i class="flaticon flaticon-log-download icon-sm"></i> Exportar
					    </button>
					</div>
					
				    <div class="ts-grid-body">				
				    	<table class="ts-grid-table" id="vf-tabela-consulta">				
				      		<thead>
					            <tr>
					            	<th style="width:100px">Ações</th>
					            	<th style="width:100px">Solicitação</th>
					                <th style="width:100px">Data</th>
					                <th style="width:220px">Nome Projeto</th>
					                <th style="width:120px">Projeto</th>
					                <th style="width:200px">Tarefa</th>
					                <th style="width:120px">Código Tarefa</th>
					                <th style="width:200px">Situação</th>
					                <th style="width:100px">Horas</th>					                
					            </tr>
					        </thead>
					        <tbody></tbody>			
			    		</table>	
			    		
			    		<!-- Paginação -->
					    <div class="text-center">
					        <ul class="pagination vf-pagination" id="vf-paginacao"></ul>
					    </div>			
			  		</div>
				</div>	
    		</section>
    		
    		<!-- --- APROVAÇÃO --- -->
    		<section class="ts-view ts-aprovacao" id="divAprovacao" data-view="aprovacoes">
		  		<h3>Aprovação de horas</h3>
				
		      	<div class="ts-cards-aprovacao">
		      		<div class="ts-card-aprovacao ts-card-success">
				    	<span class="ts-card-label">Aprovações realizadas</span>
				    	<strong class="ts-card-value" id="ts-aprovacoes-realizadas">--</strong>
				  	</div>
				  	
			  		<div class="ts-card-aprovacao ts-card-warning">
				    	<span class="ts-card-label">Aprovações pendentes</span>
				    	<strong class="ts-card-value" id="ts-aprovacoes-pendentes">--</strong>
				  	</div>
				  	
				  	<div class="ts-card-aprovacao">
				    	<span class="ts-card-label">Projetos</span>
				    	<strong class="ts-card-value" id="ts-projetos-pendentes">--</strong>
				  	</div>
				  	
				  	<div class="ts-card-aprovacao ts-card-primary">
				    	<span class="ts-card-label">Fim da competência</span>
				    	<strong class="ts-card-value" id="ts-aprovacoes-competencia">--</strong>
				  	</div>		
				</div><hr>
				
			    <div class="row">				
			        <div class="col-md-4">
			            <label>Colaborador</label>
			            <select id="filtro-colaborador" class="form-control vf-zoom-colaborador" style="width:100%"></select>
			            <input type="hidden" name="filtro-cod-colaborador" id="filtro-cod-colaborador" />
			        </div>
			        
			        <div class="col-md-4">
			            <label>Projeto</label>
			            <select id="filtro-projeto-aprov" class="form-control vf-zoom-projeto-aprov" style="width:100%"></select>
			            <input type="hidden" name="filtro-id-projeto-aprov" id="filtro-id-projeto-aprov" />
			            <input type="hidden" name="filtro-cod-projeto-aprov" id="filtro-cod-projeto-aprov" />
			        </div>
			
			        <div class="col-md-4">
			            <label>Tarefa</label>
			            <select id="filtro-tarefa-aprov" class="form-control vf-zoom-tarefa-aprov" style="width:100%"></select>
			            <input type="hidden" name="filtro-cod-tarefa-aprov" id="filtro-cod-tarefa-aprov" />
			        </div>			
			    </div><br>
			    
			    <div class="row">				
			        <div class="col-md-2">
			            <label>Mês</label>
			            <select id="filtro-aprov-mes" class="form-control">
			                <option value="01">Janeiro</option>
			                <option value="02">Fevereiro</option>
			                <option value="03">Março</option>
			                <option value="04">Abril</option>
			                <option value="05">Maio</option>
			                <option value="06">Junho</option>
			                <option value="07">Julho</option>
			                <option value="08">Agosto</option>
			                <option value="09">Setembro</option>
			                <option value="10">Outubro</option>
			                <option value="11">Novembro</option>
			                <option value="12">Dezembro</option>
			            </select>
			        </div>		        
			        				
			        <div class="col-md-2">
			            <label>Ano</label>
			            <input type="text" id="filtro-aprov-ano" class="form-control">
			        </div>
			        
			        <div class="form-group col-md-8">
					    <label>Status</label><br>						
					    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
					        <input type="checkbox" id="aprov-status-revisado" class="vf-filtro-aprov-status" value="Revisado">
					        <label for="aprov-status-revisado">Revisado</label>
					    </div>
					
					    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
					        <input type="checkbox" id="aprov-status-aprovado" class="vf-filtro-aprov-status" value="Aprovado">
					        <label for="aprov-status-aprovado">Aprovado</label>
					    </div>
					
					    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
					        <input type="checkbox" id="aprov-status-reprovado" class="vf-filtro-aprov-status" value="Reprovado">
					        <label for="aprov-status-reprovado">Reprovado</label>
					    </div>
					
					    <div class="custom-checkbox custom-checkbox-inline custom-checkbox-warning">
					        <input type="checkbox" id="aprov-status-andamento" class="vf-filtro-aprov-status" value="Pendente aprovação" checked>
					        <label for="aprov-status-andamento">Pendente aprovação</label>
					    </div>						
					</div>
		        </div><br>
			    
			    <div class="row">
			    	<div class="form-group col-md-2">
						<button class="btn btn-primary" id="btn-filtrar-aprov">
							<i class="flaticon flaticon-search icon-sm"></i> Filtrar
						</button>
					</div>	
			    </div><hr>
			    
			    <div class="vf-acoes-aprovacao">
				    <div class="vf-acoes-left">				
				        <button id="btn-export-aprovacoes" class="btn btn-info" title="Exportar para Excel" disabled>				
				            <i class="flaticon flaticon-log-download icon-sm"></i> Exportar
   				        </button>
				
				        <button id="btn-aprovar-lote" class="btn btn-success" disabled>				
				            <i class="flaticon flaticon-playlist-add-check"></i> Aprovar Registros Selecionados				
				        </button>				
				    </div>
				
				    <div id="vf-total-horas-projeto" class="vf-total-horas-projeto" style="display:none;">					
					    <div class="vf-total-pendente-card">					
					        <div class="vf-total-pendente-header">					
					            <i class="flaticon flaticon-clock icon-md"></i>					
					            <span>Total horas pendentes</span>					
					        </div>
					
					        <div class="vf-total-pendente-value">
					            00:00
					        </div>					
					    </div>
					    
					    <div class="vf-total-aprovado-card">					
					        <div class="vf-total-aprovado-header">					
					            <i class="flaticon flaticon-clock icon-md"></i>					
					            <span>Total horas aprovadas</span>					
					        </div>
					
					        <div class="vf-total-aprovado-value">
					            00:00
					        </div>					
					    </div>					
					</div>				
				</div>
				
			    <div class="ts-grid-body">				
			    	<table class="ts-grid-table" id="vf-tabela-aprovacao">				
			      		<thead>
				            <tr>
				            	<th style="width:50px;height:20px;text-align:center;">
							        <div class="custom-checkbox custom-checkbox-primary vf-checkbox-header">
									    <input type="checkbox" id="vf-check-all-aprov">									
									    <label for="vf-check-all-aprov"></label>
									</div>
							    </th>
				            	<th style="width:70px">Ações</th>
				            	<th style="width:120px">ID Tarefa</th>
				            	<th style="width:150px">Nome Tarefa</th>				            	
				            	<th style="width:200px">Colaborador</th>
				                <th style="width:100px">Data</th>
				                <th style="width:150px">ID Projeto</th>
				                <th style="width:200px">Nome Projeto</th>
				                <th style="width:110px">Solicitação</th>
				                <th style="width:170px">Situação</th>
				                <th style="width:70px">Horas</th>					                
				            </tr>
				        </thead>
				        <tbody></tbody>			
		    		</table>	
		    		
				    <div class="text-center">
				        <ul class="pagination vf-pagination" id="vf-paginacao-aprovacao"></ul>
				    </div>			
		  		</div>
    		</section>
    		
    		<!-- --- RELATÓRIOS --- -->
    		<section class="ts-view ts-relatorio" id="divRelatorios" data-view="relatorios">
			    <h3>Relatórios</h3>
				
				<!-- --- horas detalhadas --- -->
				<div class="panel panel-warning ts-panel">
					<div class="panel-body">
			            <h4 class="panel-title">Relatório de horas detalhadas</h4><br>
			            
					    <div class="panel panel-default ts-panel">
					        <div class="panel-body">
					            <h5 class="panel-title">Filtros</h5><br>
		
					            <div class="row">
					                <div class="form-group col-md-4">
									    <label for="relDataInicio">Data início</label>
									    <div class="input-group date" id="grpRelDataInicio">
									        <input type="text" class="form-control" id="relDataInicio" placeholder="DD/MM/AAAA" readonly>
									        <span class="input-group-addon">
									            <span class="fluigicon fluigicon-calendar"></span>
									        </span>
									    </div>
									</div>
									
									<div class="form-group col-md-4">
									    <label for="relDataFim">Data fim</label>
									    <div class="input-group date" id="grpRelDataFim">
									        <input type="text" class="form-control" id="relDataFim" placeholder="DD/MM/AAAA" readonly>
									        <span class="input-group-addon">
									            <span class="fluigicon fluigicon-calendar"></span>
									        </span>
									    </div>
									</div>
		
					                <div class="form-group col-md-4">
					                    <label>Tipo de relatório</label>
					                    <select class="form-control" id="rel-tipo">
					                        <option value="analitico">Analítico</option>
					                        <option value="sintetico">Sintético</option>
					                    </select>
					                </div>
					            </div>
		
					            <div class="row">
					                <div class="form-group col-md-4">
					                    <label>Colaborador</label>
					                    <select id="filtro-rel-colaborador" class="form-control vf-zoom-colaborador" multiple="multiple" style="width:100%"></select>
					                    <input type="hidden" name="filtro-cod-rel-colaborador" id="filtro-cod-rel-colaborador">
					                </div>
		
					                <div class="form-group col-md-4">
					                    <label>Projeto</label>
					                    <select id="filtro-projeto-rel-aprov" class="form-control vf-zoom-projeto-aprov" style="width:100%"></select>
					                    <input type="hidden" name="filtro-id-projeto-rel-aprov" id="filtro-id-projeto-rel-aprov">
					                    <input type="hidden" name="filtro-cod-projeto-rel-aprov" id="filtro-cod-projeto-rel-aprov">
					                </div>
		
					                <div class="form-group col-md-4">
					                    <label>Tarefa</label>
					                    <select id="filtro-tarefa-rel-aprov" class="form-control vf-zoom-tarefa-aprov" style="width:100%"></select>
					                    <input type="hidden" name="filtro-cod-tarefa-rel-aprov" id="filtro-cod-tarefa-rel-aprov">
					                </div>
					            </div>
		
					            <div class="row">
					                <div class="form-group col-md-12 text-right">
					                    <button class="btn btn-primary" id="btn-filtrar-rel">
					                        <i class="flaticon flaticon-search icon-sm"></i> Filtrar
					                    </button>
					                </div>
					            </div>
					        </div>
					    </div>
		
					    <div class="panel panel-default ts-panel" id="panelResultadoRelatorio" style="display:none;">
					        <div class="panel-body">
					            <h5 class="panel-title" id="tituloResultadoRelatorio">Resultado</h5><br>
		
					            <div class="vf-export-wrapper" style="margin-bottom:10px;text-align:right">
					                <button id="btn-export-rel-excel" class="btn btn-info" title="Exportar para Excel" disabled>
					                    <i class="flaticon flaticon-log-download icon-sm"></i> Exportar
					                </button>
					            </div>
		
					            <div class="ts-grid-body">
					                <table class="ts-grid-table" id="vf-tabela-relatorio">
					                    <thead></thead>
					                    <tbody>
					                        <tr>
					                            <td class="text-center" style="padding:20px;">
					                                Nenhum relatório consultado
					                            </td>
					                        </tr>
					                    </tbody>
					                </table>
		
					                <div class="text-center">
					                    <ul class="pagination vf-pagination" id="vf-paginacao-relatorio"></ul>
					                </div>
					            </div>
					        </div>
					    </div>
				    </div>
			    </div>
			    
			    <!-- --- horas detalhadas --- -->
			    <div class="panel panel-warning ts-panel" id="panelRelatorioInfoUsuarios">
				    <div class="panel-body">
				        <h4 class="panel-title">Relatório Info Usuários</h4>
				        <br>
				
				        <div class="panel panel-default ts-panel">
				            <div class="panel-body">
				                <h5 class="panel-title">Filtros</h5>
				                <br>
				
				                <div class="row">
				                    <div class="form-group col-md-4">
									    <label for="filtro-rel-info-colab">Colaborador</label>
									    <select id="filtro-rel-info-colab" class="form-control vf-zoom-colaborador" style="width:100%"></select>
									    <input type="hidden" name="filtro-rel-info-cod-colab" id="filtro-rel-info-cod-colab">
									</div>
				
				                    <div class="form-group col-md-4">
				                        <label for="filtro-rel-info-mes">Mês</label>
				                        <select id="filtro-rel-info-mes" class="form-control">
				                            <option value="01">Janeiro</option>
				                            <option value="02">Fevereiro</option>
				                            <option value="03">Março</option>
				                            <option value="04">Abril</option>
				                            <option value="05">Maio</option>
				                            <option value="06">Junho</option>
				                            <option value="07">Julho</option>
				                            <option value="08">Agosto</option>
				                            <option value="09">Setembro</option>
				                            <option value="10">Outubro</option>
				                            <option value="11">Novembro</option>
				                            <option value="12">Dezembro</option>
				                        </select>
				                    </div>
				
				                    <div class="form-group col-md-4">
				                        <label for="filtro-rel-info-ano">Ano</label>
				                        <input type="text" id="filtro-rel-info-ano" class="form-control">
				                    </div>
				                </div>
				                
				                <div class="row">
				                	<div class="form-group col-md-12 text-right" style="padding-top:25px;">
				                        <button type="button" class="btn btn-primary" id="btnFiltrarInfoUsuarios">
				                            <i class="flaticon flaticon-search icon-sm"></i> Filtrar
				                        </button>
				
				                        <button type="button" class="btn btn-success" id="btnAlertarPendenciasInfoUsuarios" disabled>
				                            <i class="flaticon flaticon-email icon-sm"></i> Alertar pendências
				                        </button>
				
				                        <button type="button" class="btn btn-info" id="btnExportarInfoUsuarios" disabled>
				                            <i class="flaticon flaticon-download icon-sm"></i> Exportar
				                        </button>
				                    </div>
				                </div>
				            </div>
				        </div>
				
				        <div class="panel panel-default ts-panel" id="panelResultadoInfoUsuarios" style="display:none;">
				            <div class="ts-grid-body">
							    <table class="ts-grid-table" id="tblInfoUsuarios">
							        <thead>
							            <tr>
							                <th style="width:60px;">#</th>
							                <th style="width:260px;">Colaborador</th>
							                <th style="width:150px;">Horas disponíveis</th>
							                <th style="width:150px;">Horas apontadas</th>
							                <th style="width:150px;">Horas pendentes</th>
							                <th style="width:120px;">Ausências</th>
							                <th style="width:140px;">Ações</th>
							            </tr>
							        </thead>
							        <tbody></tbody>
							    </table>
							</div>
							
							<div class="text-center">
							    <ul id="vf-paginacao-info-usuarios" class="pagination vf-pagination"></ul>
							</div>
				        </div>
				    </div>
				</div>
			</section>

    		<!-- --- APROVAÇÃO MASSIVA --- -->
    		<section class="ts-view" id="divAprovacaoMassiva" data-view="aprovacao-massiva">
				<h3>Aprovação Massiva</h3>
						
			    <div class="panel panel-default ts-panel">
			    	<div class="panel-body">			            
			            <div class="row">			
			                <div class="col-md-12 text-center">			
			                    <button type="button" class="btn btn-info" id="btnBuscarPendencias">		
			                        <i class="flaticon flaticon-search icon-sm"></i> Buscar pendências		
			                    </button>
				
				                <button type="button" class="btn btn-success" id="btnIniciarAprovacaoMassiva" disabled>			
				                	<i class="flaticon flaticon-rocket icon-sm"></i> Iniciar aprovação massiva			
				                </button>			
			            	</div>			
			            </div>		
		            </div>	
		        </div>
			
			    <div class="row ts-massiva-resumo" id="divResumoMassiva" style="display:none;">
			        <div class="col-md-6">			
			            <div class="panel panel-default ts-card-metrica">			
			                <div class="panel-body text-center">			
			                    <div class="ts-card-title">Total pendente</div>			
			                    <div class="ts-card-value text-warning" id="tsMassivaTotal">0</div>			
			                </div>			
			            </div>			
			        </div>
			
			        <div class="col-md-6">			
			            <div class="panel panel-default ts-card-metrica">			
			                <div class="panel-body text-center">			
			                    <div class="ts-card-title">Total processados</div>			
			                    <div class="ts-card-value" id="tsMassivaProcessados">0</div>			
			                </div>			
			            </div>			
			        </div>		
			    </div>
			
			    <div class="panel panel-default ts-panel" id="divProgressMassiva" style="display:none;">				
			        <div class="panel-body">
			        	<h5 class="panel-title">Processamento</h5><br>
			        	
			            <div class="row">			
			                <div class="col-md-12">			
			                    <div class="ts-massiva-status">			
			                        <span id="tsMassivaStatusLabel" class="label label-default">
									    <span id="tsMassivaStatus">Aguardando</span>
									</span>			
			                    </div>			
			                </div>			
			            </div>
			
			            <div class="row">			
			                <div class="col-md-12">			
			                    <div class="progress">			
			                        <div class="progress-bar progress-bar-success progress-bar-striped active" id="tsMassivaProgressBar" role="progressbar" aria-valuenow="0"
									    aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da aprovação massiva" style="width:0%;">0%</div>			
			                    </div>			
			                </div>			
			            </div>
			
			            <div class="row">			
			                <div class="col-md-12">			
			                    <div class="ts-progress-info">		
			                        <strong>Tempo médio estimado:</strong>			
			                        <span id="tsMassivaETA">--</span>			
			                    </div>			
			                </div>		
			            </div>			
			        </div>			
			    </div>		
			    				
				<div class="panel panel-default ts-panel" id="divHistoricoMassiva">	
					<!-- JS vai preencher -->			
				</div>	
				
				<div class="panel panel-default ts-panel" id="divDetalhesMassiva">
			        <div class="panel-body">
			        	<h5 class="panel-title">Detalhe da execução</h5><br>
						
					 	<div class="vf-export-wrapper" style="margin-bottom:10px;text-align:right">
						    <button id="btn-export-aprovacao-massiva-excel" class="btn btn-info" title="Exportar para Excel" disabled>
						        <i class="flaticon flaticon-log-download icon-sm"></i> Exportar
						    </button>
						</div>
			        				
			            <div class="ts-grid-body">				
					    	<table class="ts-grid-table" id="vf-tabela-aprovacao-massiva">				
					      		<thead>
						            <tr>
						            	<th>Solicitação</th>
						            	<th>Colaborador</th>
						            	<th>Data abertura</th>
						            	<th>Data apontamento</th>
						            	<th>Horas</th>
						            	<th>Projeto</th>
						            	<th>Aprovador</th>
						            	<th>Data aprovação</th>
						            	<th>Status</th>
										<th>Detalhes</th>						                
						            </tr>
						        </thead>
						        <tbody>
						        	<td colspan="10" class="text-center">Nenhuma execução selecionada</td>
						        </tbody>			
				    		</table>	
				    		
						    <div class="text-center">
						        <ul class="pagination vf-pagination" id="vf-paginacao-aprovacao-massiva"></ul>
						    </div>			
				  		</div>		
			        </div>			
			    </div>	
			</section>
  		</main>  		
	</div>
		
</div>