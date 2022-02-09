<?php
/*
 * Plugin Name: voice recorder
 * Description: record voices, save recoreded voice or upload as comment. use shortcode [voice_rec] in each post that you want add recording box.use shortcode [voice_rec] in each post that you want add recording box.
 * Version: 1.0.0
 * Author: Shirin Niki
 * License: GPL3
*/

function v_rec_enqueue_scripts() {
    wp_enqueue_script( 'record-lib-js', plugin_dir_url( __FILE__ ) . 'include/wzrecorder.js','','', true);
    wp_enqueue_script( 'rec-js', plugin_dir_url( __FILE__ ) . 'include/apps.js', array( 'record-lib-js','jquery'), '', true);
    wp_enqueue_style( 'style-css', plugin_dir_url( __FILE__ ) . 'include/style.css' );
    $id = get_the_ID();
    $USER_ID = wp_get_current_user()->ID;
    $translations = array(
            'postID' => $id,
            'USER_ID' => $USER_ID,
            'AUDIO_URL'=> plugin_dir_url( __FILE__ ) . 'include/audio/',
            'ajaxurl' => admin_url('admin-ajax.php')
        );
    wp_localize_script( 'rec-js', 'translation', $translations );

}
add_action( 'wp_enqueue_scripts', 'v_rec_enqueue_scripts');

function voice_rec_sht_cd( $atts = array(), $content = null ) {
        $btn = '<div class="col-md-12"  style="margin:10px auto;"><ol id="recordingList" style="text-align: left"></ol>
                    </div>';
    $var = '<div class="row  voice-rec-container"> 
               <div class="col-md-12 recording-part">
                    <canvas id="moj"></canvas> 
                    <p id="rec-duration" >Duration: <span id="duration">0ms</span></p>
               </div>
              
               <div class="col-md-4 recording-part">
                   <button id="record" ></button>
               </div>'.$btn.'           
	        </div>';
    return $var;
}
add_shortcode('voice_rec', 'voice_rec_sht_cd');

function insert_voice_to_comment($id,$userId,$comments){
    $data = array(
        'comment_post_ID' => $id,
        'comment_content' => ((!empty($comments))?$comments:get_the_title($id).' - '.$userId),
        'user_id' => $userId,
        'comment_approved' => 1,
    );
    // Insert the comment into the database
    $result = wp_insert_comment($data);

}
function upload_as_comment() {
    $input = $_FILES['audio_data']['tmp_name']; //temporary name that PHP gave to the uploaded file
    $name_upload = $_FILES['audio_data']['name'].".wav"; 
    $id = $_POST['pID'];
    $user_id = $_POST['uID'];
    add_filter( 'upload_dir', 'alter_the_upload_dir');
    $thefile = wp_upload_bits($name_upload, null, file_get_contents($input));
    $comments = $thefile['url'];
    insert_voice_to_comment($id,$user_id,$comments);
    echo $thefile['error'];
    die();
}
add_action('wp_ajax_upload_as_comment', 'upload_as_comment');

//create uplooad file
function alter_the_upload_dir($upload){
    global $current_user;
    $upload['subdir'] =  '/voice-recorder/' . $current_user->user_login   ;
    $upload['path'] = $upload['basedir'] . $upload['subdir'];
    $upload['url']  = $upload['baseurl'] . $upload['subdir'];
    return $upload;
}
