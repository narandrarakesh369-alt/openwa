import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tunnel_url } = await req.json();

    if (!tunnel_url) {
      return new Response(
        JSON.stringify({ error: 'tunnel_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update ALL whatsapp_settings rows with the new server_url
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .update({ server_url: tunnel_url })
      .neq('id', '00000000-0000-0000-0000-000000000000') // match all rows
      .select('id, school_id');

    if (error) {
      console.error('Update error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updated ${data?.length || 0} whatsapp_settings rows with URL: ${tunnel_url}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: data?.length || 0,
        tunnel_url 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
