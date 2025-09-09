import { NextResponse } from "next/server"
import { supabaseAdmin, supabaseApiV1 } from "@/lib/supabase/admin"

export async function GET() {
  try {
    // 1. Проверяем сколько преподавателей в profiles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email, role, category, branch_id")
      .eq("role", "Teacher")
      .order("full_name")

    if (profilesError) throw new Error(`Profiles error: ${profilesError.message}`)

    // 2. Проверяем сколько записей в current_scores
    const { data: scoresData, error: scoresError } = await supabaseAdmin
      .from("current_scores")
      .select("teacher_id, score, rank")
      .eq("scope", "teacher_overall")
      .eq("context", "all")
      .not("teacher_id", "is", null)

    if (scoresError) throw new Error(`Current scores error: ${scoresError.message}`)

    // 3. Проверяем teacher_metrics
    const { data: metricsData, error: metricsError } = await supabaseAdmin
      .from("teacher_metrics")
      .select("teacher_id, branch_id, score, last_year_base, trial_total")

    if (metricsError) throw new Error(`Teacher metrics error: ${metricsError.message}`)

    // 4. Проверяем новый view
    const { data: viewData, error: viewError } = await supabaseApiV1
      .from("vw_leaderboard_teacher_overall_all")
      .select("*")

    if (viewError) throw new Error(`View error: ${viewError.message}`)

    // 5. Проверяем филиалы
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from("branch")
      .select("id, name")

    if (branchError) throw new Error(`Branch error: ${branchError.message}`)

    // 6. Анализируем расхождения
    const teacherIds = new Set(profilesData?.map(p => p.user_id) || [])
    const scoreIds = new Set(scoresData?.map(s => s.teacher_id) || [])
    const metricIds = new Set(metricsData?.map(m => m.teacher_id) || [])
    const branchIds = new Set(branchData?.map(b => b.id) || [])

    const missingInScores = profilesData?.filter(p => !scoreIds.has(p.user_id)) || []
    const missingInMetrics = profilesData?.filter(p => !metricIds.has(p.user_id)) || []
    const phantomInScores = scoresData?.filter(s => !teacherIds.has(s.teacher_id)) || []
    const phantomInMetrics = metricsData?.filter(m => !teacherIds.has(m.teacher_id)) || []
    
    // Проверяем ссылки на несуществующие филиалы
    const invalidBranchRefs = profilesData?.filter(p => p.branch_id && !branchIds.has(p.branch_id)) || []
    const invalidBranchRefsInMetrics = metricsData?.filter(m => m.branch_id && !branchIds.has(m.branch_id)) || []

    return NextResponse.json({
      success: true,
      analysis: {
        profiles_teachers: profilesData?.length || 0,
        current_scores_records: scoresData?.length || 0,
        teacher_metrics_records: metricsData?.length || 0,
        view_records: viewData?.length || 0,
        missing_in_scores: missingInScores.length,
        missing_in_metrics: missingInMetrics.length,
        phantom_in_scores: phantomInScores.length,
        phantom_in_metrics: phantomInMetrics.length,
        invalid_branch_refs: invalidBranchRefs.length,
        invalid_branch_refs_in_metrics: invalidBranchRefsInMetrics.length,
        total_branches: branchData?.length || 0
      },
      details: {
        profiles_teachers: profilesData?.map(p => ({ 
          id: p.user_id, 
          name: p.full_name || p.email, 
          branch_id: p.branch_id 
        })) || [],
        missing_in_scores: missingInScores.map(p => ({ 
          id: p.user_id, 
          name: p.full_name || p.email 
        })),
        missing_in_metrics: missingInMetrics.map(p => ({ 
          id: p.user_id, 
          name: p.full_name || p.email 
        })),
        phantom_in_scores: phantomInScores.map(s => ({ 
          id: s.teacher_id, 
          score: s.score,
          rank: s.rank 
        })),
        phantom_in_metrics: phantomInMetrics.map(m => ({ 
          id: m.teacher_id, 
          score: m.score,
          last_year_base: m.last_year_base,
          trial_total: m.trial_total
        })),
        invalid_branch_refs: invalidBranchRefs.map(p => ({ 
          id: p.user_id, 
          name: p.full_name || p.email,
          invalid_branch_id: p.branch_id
        })),
        invalid_branch_refs_in_metrics: invalidBranchRefsInMetrics.map(m => ({ 
          teacher_id: m.teacher_id, 
          invalid_branch_id: m.branch_id
        })),
        branches: branchData?.map(b => ({ id: b.id, name: b.name })) || [],
        view_sample: viewData?.slice(0, 5).map(v => ({
          name: v.name,
          score: v.score,
          rank: v.rank,
          branch: v.branch_name
        })) || []
      }
    })

  } catch (error: any) {
    console.error("[DEBUG] Database analysis failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
