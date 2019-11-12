module EventSearch exposing (..)

import Browser exposing (element)
import Html exposing (..)
import Html.Attributes exposing (style, href, placeholder, value, type_)
import Html.Events.Extra exposing (onEnter)
import Html.Events exposing (onClick, onInput)
import Date exposing (Date)
import DatePicker exposing (..)
import Http exposing (get, Error)
import Json.Decode as JD exposing (Decoder, list, string, decodeString)
import Url.Builder as U exposing (..)
import Time exposing (Zone, millisToPosix, utc, toYear)
import Task exposing (..)

type alias Event = {
    name: String
    , description: String
    , location: String
    , source: String
    , time: Int
    }

type alias Model = {
    freeText : Maybe String
    , city : String 
    , fromDatePicker : DatePicker 
    , fromDate: Maybe Date 
    , toDatePicker : DatePicker 
    , toDate: Maybe Date 
    , events: List Event
    , cities: List String
    , state: State
    , timeZone : Maybe Zone
    }

type Msg = Submit |
  Change String |
  EnterPressed |
  ToStartDatePicker DatePicker.Msg |
  ToEndDatePicker DatePicker.Msg |
  GotCities (Result Http.Error (List String)) |
  GotEvents (Result Http.Error (List Event)) |
  TimeZoneUpdated Zone

type State = Loading | Ready | Error

getCities : Cmd Msg
getCities = Http.get { url = "http://localhost:8080/cities", expect = Http.expectJson GotCities cityDecoder}

cityDecoder : Decoder (List String)
cityDecoder = list JD.string

queryUrl : Model -> String
queryUrl model = 
  let
      freeTextParam = 
        case model.freeText of
            Nothing -> []
            Just freeText -> [U.string "query" freeText]
      cityParam = [U.string "city" model.city]
      fromDateParam = 
        case model.fromDate of
            Nothing -> []
            Just date -> [U.string "fromDate" (Date.toIsoString date)]
      toDateParam = 
        case model.toDate of
            Nothing -> []
            Just date -> [U.string "toDate" (Date.toIsoString date)] 

      params = freeTextParam ++ cityParam ++ fromDateParam ++ toDateParam
  in
  U.crossOrigin 
    "http://localhost:8080" ["search"] params   

getEvents : Model -> Cmd Msg
getEvents model = Http.get { url = queryUrl model, expect = Http.expectJson GotEvents eventListDecoder}

eventListDecoder : Decoder (List Event)
eventListDecoder = list eventDecoder

eventDecoder : Decoder Event
eventDecoder = JD.map5 Event
  (JD.field "title" JD.string)
  (JD.field "description" JD.string)
  (JD.field "location" JD.string)
  (JD.field "source" JD.string)
  (JD.field "date" JD.int)

getTime : Cmd Msg
getTime =
    Time.here
        |> Task.perform TimeZoneUpdated

init : (Model, Cmd Msg)
init = 
  let
      (datePickerFrom, datePickerCmdFrom) = DatePicker.init
      (datePickerTo, datePickerCmdTo) = DatePicker.init
  in
  ({
    freeText = Nothing
    , city = ""
    , fromDatePicker = datePickerFrom
    , fromDate = Nothing   
    , toDatePicker = datePickerTo
    , toDate = Nothing
    , events = []
    , cities = ["All"]
    , state = Loading
    , timeZone = Nothing
  }, Cmd.batch [Cmd.map ToStartDatePicker datePickerCmdFrom, Cmd.map ToEndDatePicker datePickerCmdTo, getCities])

visibility : Model -> State -> Attribute msg
visibility model state = 
  if model.state /= state then 
    style "display" "none" 
  else 
    style "" ""

-- View
view : Model -> Html Msg
view model =
    div [] [
       h2 [] [ text "Search for events" ]
       , input [ placeholder "Search", onInput Change ] []
       , select [] (List.map (\x -> option [value x] [text x])  model.cities)
       , DatePicker.view model.fromDate defaultSettings model.fromDatePicker |> Html.map ToStartDatePicker
       , DatePicker.view model.toDate defaultSettings model.toDatePicker |> Html.map ToEndDatePicker
       , button [onClick Submit ] [ text "Submit" ]
       , div [] [
         p [visibility model Error] [text "An error has occurred"]
         , p [visibility model Loading] [text "Loading..."]
         , table [] [
           thead [] [
             th [] [text "Title"]
             , th [] [text "Description"]
             , th [] [text "Location"]
             , th [] [text "Source"]
             , th [] [text "Time"]
           ]
           , tbody [] (List.map (\event -> tr [] [
             td [] [text event.name]
             , td [] [text event.description]
             , td [] [text event.location]
             , td [] [text event.source]
             , td [] [text <| String.fromInt <| toYear (Maybe.withDefault utc model.timeZone) <| millisToPosix event.time]
           ]) model.events)
         ]
       ]
    ]

-- Update
update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Change str ->
      ({ model | freeText = Just str }, Cmd.none)
    Submit ->          
      ({model | state = Loading}, getEvents model)
    EnterPressed ->
      ({model | state = Loading}, getEvents model)
    ToStartDatePicker subMsg ->
      let
        ( newDatePicker, dateEvent ) =
            DatePicker.update defaultSettings subMsg model.fromDatePicker
        newDate =
            case dateEvent of
                Picked changedDate ->
                    Just changedDate
                _ ->
                    model.fromDate
      in
      ( { model
          | fromDate = newDate
          , fromDatePicker = newDatePicker
        }
      , Cmd.none
      )
    ToEndDatePicker subMsg ->
      let
        ( newDatePicker, dateEvent ) =
            DatePicker.update defaultSettings subMsg model.toDatePicker
        newDate =
          case dateEvent of
            Picked changedDate ->
              Just changedDate
            _ ->
              model.toDate
      in
      ( { model
          | toDate = newDate
          , toDatePicker = newDatePicker
        }
      , Cmd.none
      )
    GotCities result ->
      case result of
        Ok cities ->
          ({model | cities = cities ++ ["All"], state = Ready}, Cmd.none)
        Err _ ->
          ({model | state = Error}, Cmd.none)
    GotEvents result ->
      case result of
          Ok events ->
            ({model | events = events, state = Ready}, Cmd.none)
          Err _ ->
            ({model | state = Error}, Cmd.none)
    TimeZoneUpdated zone ->
      ({model | timeZone = Just zone}, Cmd.none)

              

-- Main
main : Program () Model Msg
main =
    element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = (\_ -> Sub.none)
        }