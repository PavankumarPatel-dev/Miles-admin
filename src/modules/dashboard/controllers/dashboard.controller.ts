import { Controller, Get, Query } from '@nestjs/common';
import { Serialize } from '../../../common/interceptors/serialize.interceptor';
import { ChartQueryDto } from '../dto/chart-query.dto';
import { DashboardAlertDto } from '../dto/response/dashboard-alert.dto';
import { DashboardChartsDto } from '../dto/response/dashboard-charts.dto';
import { DashboardStatsDto } from '../dto/response/dashboard-stats.dto';
import { StatsQueryDto } from '../dto/stats-query.dto';
import { DashboardService } from '../services/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @Serialize(DashboardStatsDto)
  stats(@Query() query: StatsQueryDto) {
    return this.dashboard.stats(query);
  }

  @Get('charts')
  @Serialize(DashboardChartsDto)
  charts(@Query() query: ChartQueryDto) {
    return this.dashboard.charts(query);
  }

  @Get('alerts')
  @Serialize(DashboardAlertDto)
  alerts() {
    return this.dashboard.alerts();
  }
}
