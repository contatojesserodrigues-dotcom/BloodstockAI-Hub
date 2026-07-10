/**
 * Proprietary Database Persistence Layer
 * Saves ALL search results into the BloodstockAI proprietary database.
 * Every Perplexity search result is permanently stored for future use.
 */

// ═══ FULL 5-GENERATION PEDIGREE SAVE ═══
export async function saveFullPedigreeTree(
  supabaseClient: any,
  horseName: string,
  horseData: any,
  horseId: string | null
): Promise<void> {
  try {
    const p = horseData.pedigree || {};
    const inbreeding = horseData.inbreeding || {};
    const dosage = horseData.dosage || {};
    const nick = horseData.nick_analysis || {};
    const geneticProfile = horseData.genetic_profile || {};
    const scores = horseData.scores || {};
    const dataQuality = horseData.data_quality || {};

    // Build gen4/gen5 from arrays
    const gen3 = p.generation_3 || [];
    const gen4Array = p.generation_4 || [];
    const gen5Array = p.generation_5 || [];

    const pedigreeRecord: Record<string, any> = {
      horse_id: horseId,
      horse_name: horseName,

      // GENERATION 1
      sire: p.sire || null,
      dam: p.dam || null,

      // GENERATION 2
      sire_sire: p.sire_sire || null,
      sire_dam: p.sire_dam || null,
      dam_sire: p.dam_sire || null,
      dam_dam: p.dam_dam || null,

      // GENERATION 3 (8 ancestors)
      sire_sire_sire: p.sire_sire_sire || gen3[0] || null,
      sire_sire_dam: p.sire_sire_dam || gen3[1] || null,
      sire_dam_sire: p.sire_dam_sire || gen3[2] || null,
      sire_dam_dam: p.sire_dam_dam || gen3[3] || null,
      dam_sire_sire: p.dam_sire_sire || gen3[4] || null,
      dam_sire_dam: p.dam_sire_dam || gen3[5] || null,
      dam_dam_sire: p.dam_dam_sire || gen3[6] || null,
      dam_dam_dam: p.dam_dam_dam || gen3[7] || null,

      // GENERATION 4 & 5 — stored as JSONB
      gen4: gen4Array.length > 0 ? gen4Array : null,
      gen5: gen5Array.length > 0 ? gen5Array : null,

      // GENETIC CALCULATIONS
      inbreeding_coefficient: parseFloat(inbreeding.coefficient) || null,
      inbreeding_patterns: inbreeding.pattern
        ? (typeof inbreeding.pattern === 'string' ? [inbreeding.pattern] : inbreeding.pattern)
        : null,
      chefs_de_race: geneticProfile.dosage_profile || null,
      dosage_profile: dosage.profile || null,
      dosage_index: parseFloat(dosage.dosage_index) || geneticProfile.dosage_index || null,
      center_of_distribution: parseFloat(dosage.center_of_distribution) || geneticProfile.centre_of_distribution || null,
      dosage_interpretation: dosage.distance_aptitude || dosage.details || null,

      // BLOODLINE ANALYSIS
      sire_line: geneticProfile.dominant_bloodlines?.[0] || null,
      dam_line: geneticProfile.dominant_bloodlines?.[1] || null,
      nick_rating: nick.rating || null,
      nick_notes: nick.justification || null,
      blood_percentages: geneticProfile.key_ancestors ? { key_ancestors: geneticProfile.key_ancestors } : null,

      // PERFORMANCE PREDICTIONS
      surface_affinity: geneticProfile.racing_type || horseData.career_stats?.best_surface || null,
      class_indicator: horseData.career_stats?.highest_class || null,
      avg_distance_winners: horseData.career_stats?.best_distance || null,

      // METADATA
      pedigree_sources: dataQuality.sources_used || [],
      confidence_score: dataQuality.overall_score || scores.data_confidence ? parseConfidence(scores.data_confidence) : 0,
      last_updated: new Date().toISOString(),
    };

    // ═══ IDENTITY-AWARE UPSERT ═══
    // First delete any existing record for this horse_name to prevent stale/mixed data
    await supabaseClient
      .from('pedigrees_full')
      .delete()
      .ilike('horse_name', horseName);

    const { error } = await supabaseClient
      .from('pedigrees_full')
      .insert(pedigreeRecord);

    if (error) {
      console.error(`[PEDIGREE] Save error for ${horseName}:`, error);
    } else {
      console.log(`[PEDIGREE] ✅ Saved fresh 5-gen pedigree tree for: ${horseName} (sire: ${p.sire}, dam: ${p.dam})`);
    }

    // Save each ancestor as their own horse record
    await saveAncestorsAsHorses(supabaseClient, p, horseName);

  } catch (err) {
    console.error(`[PEDIGREE] Critical error saving pedigree for ${horseName}:`, err);
  }
}

function parseConfidence(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'high') return 90;
    if (value.toLowerCase() === 'medium') return 70;
    if (value.toLowerCase() === 'low') return 40;
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

// ═══ AUTO-SAVE ANCESTORS AS INDIVIDUAL HORSE RECORDS ═══
async function saveAncestorsAsHorses(
  supabaseClient: any,
  pedigreeData: any,
  searchedHorse: string
): Promise<void> {
  try {
    const ancestors: string[] = [];
    const invalid = new Set(['', 'Unknown', 'Data unavailable', 'N/A', '—', 'unknown', 'null', 'undefined']);

    const collectAncestors = (obj: any) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        if (!invalid.has(obj) && obj.length > 1) ancestors.push(obj);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach(v => collectAncestors(v));
        return;
      }
      if (typeof obj === 'object') {
        for (const val of Object.values(obj)) {
          collectAncestors(val);
        }
      }
    };

    collectAncestors(pedigreeData);

    const uniqueAncestors = [...new Set(ancestors)].filter(
      name => name.toLowerCase() !== searchedHorse.toLowerCase()
    );

    if (uniqueAncestors.length === 0) return;

    // Batch: check which already exist
    const { data: existing } = await supabaseClient
      .from('horses')
      .select('name')
      .in('name', uniqueAncestors.slice(0, 100)); // Supabase limit safety

    const existingNames = new Set((existing || []).map((h: any) => h.name.toLowerCase()));

    const newAncestors = uniqueAncestors.filter(
      name => !existingNames.has(name.toLowerCase())
    );

    if (newAncestors.length > 0) {
      const records = newAncestors.map(name => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        created_at: new Date().toISOString(),
      }));

      // Insert in batches of 50
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        await supabaseClient.from('horses').upsert(batch, { onConflict: 'slug', ignoreDuplicates: true });
      }

      console.log(`[ANCESTORS] ➕ Added ${newAncestors.length} ancestors from ${searchedHorse}'s pedigree`);
    }
  } catch (err) {
    console.error(`[ANCESTORS] Error saving ancestors for ${searchedHorse}:`, err);
  }
}

// ═══ CHECK PEDIGREE IN DB BEFORE CALLING PERPLEXITY ═══
export async function getPedigreeFromDB(
  supabaseClient: any,
  horseName: string
): Promise<any | null> {
  try {
    const { data, error } = await supabaseClient
      .from('pedigrees_full')
      .select('*')
      .ilike('horse_name', horseName)
      .maybeSingle();

    if (error || !data) return null;

    // Check confidence and freshness
    if (data.confidence_score >= 70) {
      const updatedAt = new Date(data.last_updated || data.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (updatedAt > thirtyDaysAgo) {
        console.log(`[PEDIGREE] ✅ Found in DB for: ${horseName} (confidence: ${data.confidence_score}%)`);
        return { fromDB: true, pedigree: data };
      }
    }

    console.log(`[PEDIGREE] 🔍 Data for ${horseName} is stale or low confidence — will fetch fresh`);
    return null;
  } catch (err) {
    console.warn(`[PEDIGREE] Error checking DB for ${horseName}:`, err);
    return null;
  }
}

// ═══ MAIN PERSISTENCE (existing, enhanced) ═══
export async function persistHorseData(
  supabaseClient: any,
  horseName: string,
  horseData: any,
  rawPerplexityData: { pedigree: string; performance: string; sales: string },
  claudeAnalysis: string,
  citations: string[]
): Promise<void> {
  try {
    const slug = horseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const pedigree = horseData.pedigree || {};
    const careerStats = horseData.career_stats || {};
    const sales = Array.isArray(horseData.sales) ? horseData.sales : [];
    const performance = Array.isArray(horseData.performance) ? horseData.performance : [];

    // 1. DELETE old horse record to prevent mixing, then INSERT fresh
    await supabaseClient.from('horses').delete().eq('slug', slug);
    
    const { data: horse } = await supabaseClient
      .from('horses')
      .insert({
        name: horseName,
        slug,
        sex: horseData.sex || null,
        color: horseData.color || null,
        country: horseData.country || null,
        sire: pedigree.sire || horseData.sire || null,
        dam: pedigree.dam || horseData.dam || null,
        dam_sire: pedigree.dam_sire || horseData.dam_sire || null,
        owner: horseData.current_owner || horseData.owner || null,
        breeder: horseData.breeder || null,
        trainer: horseData.trainer || null,
        year_of_birth: horseData.year_of_birth || null,
        stud_farm: horseData.stud_farm || null,
        stud_fee: horseData.stud_fee || null,
        is_stallion: horseData.is_stallion || false,
        pedigree_data: pedigree,
        performance_data: { career_stats: careerStats, races: performance },
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    const horseId = horse?.id || null;

    // 2. Delete old pedigree record and insert fresh
    if (pedigree.sire && pedigree.dam) {
      const gen3 = pedigree.generation_3 || [];
      const gen4 = pedigree.generation_4 || [];
      const dosageObj = horseData.dosage || horseData.genetic_profile?.dosage_profile || {};
      const inbreedingObj = horseData.inbreeding || {};

      await supabaseClient.from('pedigrees').delete().ilike('horse_name', horseName);
      
      await supabaseClient.from('pedigrees').insert({
        horse_id: horseId,
        horse_name: horseName,
        generation_1_sire: pedigree.sire,
        generation_1_dam: pedigree.dam,
        generation_2_sire_sire: pedigree.sire_sire || null,
        generation_2_sire_dam: pedigree.sire_dam || null,
        generation_2_dam_sire: pedigree.dam_sire || null,
        generation_2_dam_dam: pedigree.dam_dam || null,
        generation_3: gen3.length > 0 ? gen3 : null,
        generation_4: gen4.length > 0 ? gen4 : null,
        inbreeding_coefficient: inbreedingObj.coefficient || null,
        inbreeding_patterns: inbreedingObj.pattern ? [inbreedingObj.pattern] : null,
        dosage_profile: dosageObj.profile || null,
        dosage_index: horseData.genetic_profile?.dosage_index || dosageObj.dosage_index || null,
        center_of_distribution: horseData.genetic_profile?.centre_of_distribution || dosageObj.center_of_distribution || null,
      });
    }

    // 3. ★ SAVE FULL 5-GEN PEDIGREE TREE ★
    await saveFullPedigreeTree(supabaseClient, horseName, horseData, horseId);

    // 4. Insert race results
    if (performance.length > 0) {
      const raceRecords = performance.map((race: any) => ({
        horse_id: horseId,
        horse_name: horseName,
        race_date: race.date || null,
        race_name: race.race_name || null,
        race_grade: race.race_type || null,
        track: race.track || null,
        country: race.country || horseData.country || null,
        distance: race.distance ? String(race.distance) : null,
        surface: race.surface || null,
        finish_position: race.position || null,
        prize_money: race.prize_money || null,
        currency: race.currency || careerStats.earnings_currency || null,
        source: 'perplexity_search',
      }));
      await supabaseClient.from('race_results').insert(raceRecords);
    }

    // 5. Insert sales history
    if (sales.length > 0) {
      const salesRecords = sales.map((sale: any) => ({
        horse_id: horseId,
        horse_name: horseName,
        sale_name: sale.sale_name || sale.auction_house || 'Unknown Sale',
        auction_house: sale.auction_house || null,
        sale_date: sale.date || null,
        price: sale.sale_price || null,
        currency: sale.currency || null,
        buyer: sale.buyer || null,
        seller: sale.seller || null,
        source: 'perplexity_search',
      }));
      await supabaseClient.from('sales_history').insert(salesRecords);
    }

    // 6. Upsert sire record
    if (pedigree.sire && pedigree.sire !== 'Data unavailable') {
      await supabaseClient.from('sires').upsert({
        name: pedigree.sire,
        country: horseData.country || null,
        sire_of_sire: pedigree.sire_sire || null,
        dam_of_sire: pedigree.sire_dam || null,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'name', ignoreDuplicates: true });
    }

    // 7. Upsert dam record
    if (pedigree.dam && pedigree.dam !== 'Data unavailable') {
      const siblings = pedigree.siblings || horseData.siblings_analysis?.details || [];
      await supabaseClient.from('dams').upsert({
        name: pedigree.dam,
        country: horseData.country || null,
        sire: pedigree.dam_sire || null,
        total_foals: horseData.siblings_analysis?.total_foals || null,
        total_winners: horseData.siblings_analysis?.total_winners || null,
        stakes_winners: horseData.siblings_analysis?.stakes_winners || null,
        produce_record: siblings.length > 0 ? siblings : null,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'name', ignoreDuplicates: true });
    }

    // 8. Delete old cache and save fresh search cache
    await supabaseClient.from('search_cache').delete().ilike('horse_name', horseName);
    await supabaseClient.from('search_cache').insert({
      search_query: horseName,
      horse_name: horseName,
      search_key: `${horseName}|${pedigree.sire || ''}|${pedigree.dam || ''}`,
      perplexity_raw_data: JSON.stringify(rawPerplexityData),
      claude_analysis: claudeAnalysis,
      sources_used: citations,
    });

    // 9. Log data source
    await supabaseClient.from('data_sources_log').insert({
      source_name: 'perplexity_search',
      source_url: citations[0] || null,
      data_type: 'horse_search',
      records_collected: 1 + performance.length + sales.length,
      status: 'success',
    });

    console.log(`[DB-PERSIST] Saved horse data + full pedigree: ${horseName} (id: ${horseId})`);
  } catch (error) {
    console.error(`[DB-PERSIST] Error saving ${horseName}:`, error);
  }
}

export async function checkSearchCache(
  supabaseClient: any,
  horseName: string
): Promise<{ found: boolean; data?: any; claudeAnalysis?: string } | null> {
  try {
    const { data } = await supabaseClient
      .from('search_cache')
      .select('*')
      .ilike('horse_name', horseName)
      .gte('expires_at', new Date().toISOString())
      .order('search_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      console.log(`[CACHE HIT] Found cached data for: ${horseName}`);
      return {
        found: true,
        data: data.perplexity_raw_data ? JSON.parse(data.perplexity_raw_data) : null,
        claudeAnalysis: data.claude_analysis,
      };
    }

    return null;
  } catch (error) {
    console.warn(`[CACHE] Error checking cache for ${horseName}:`, error);
    return null;
  }
}

export async function checkHorseInDB(
  supabaseClient: any,
  horseName: string
): Promise<any | null> {
  try {
    const slug = horseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const { data: horse } = await supabaseClient
      .from('horses')
      .select('*, pedigree_data, performance_data')
      .or(`slug.eq.${slug},name.ilike.${horseName}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (horse && horse.pedigree_data && horse.performance_data) {
      const updatedAt = new Date(horse.updated_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (updatedAt > thirtyDaysAgo) {
        console.log(`[DB HIT] Found fresh data for: ${horseName}`);
        return horse;
      }
      console.log(`[DB STALE] Data for ${horseName} is older than 30 days`);
    }

    return null;
  } catch (error) {
    console.warn(`[DB] Error checking DB for ${horseName}:`, error);
    return null;
  }
}
